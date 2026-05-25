import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  scoreMatch,
  findBestMatch,
  decideStatus,
  type MatchableWorkout,
  type MatchableActivity,
} from "@/lib/activities/matching";
import { complianceScore } from "@/lib/activities/compliance";
import type { WorkoutType } from "@/lib/training/types";

// ----- Schemas -----
const ACTIVITY_KIND = z.enum(["RUN", "RIDE", "WALK", "STRENGTH", "OTHER"]);
const FILE_TYPE = z.enum(["FIT", "GPX", "TCX", "CSV", "UNKNOWN"]);

const splitSchema = z.object({
  split_index: z.number().int(),
  distance_meters: z.number(),
  duration_seconds: z.number().int(),
  average_pace_sec_per_km: z.number().int().nullable().optional(),
  average_heart_rate: z.number().int().nullable().optional(),
  elevation_gain_meters: z.number().nullable().optional(),
});

const parsedSchema = z.object({
  activity_type: ACTIVITY_KIND,
  start_time: z.string(),
  timezone: z.string().nullable().optional(),
  duration_seconds: z.number().int().min(0),
  moving_time_seconds: z.number().int().nullable().optional(),
  distance_meters: z.number().min(0),
  average_pace_sec_per_km: z.number().int().nullable().optional(),
  average_speed_kmh: z.number().nullable().optional(),
  average_heart_rate: z.number().int().nullable().optional(),
  max_heart_rate: z.number().int().nullable().optional(),
  elevation_gain_meters: z.number().nullable().optional(),
  average_cadence: z.number().int().nullable().optional(),
  calories: z.number().int().nullable().optional(),
  splits: z.array(splitSchema).default([]),
  raw_summary: z.record(z.string(), z.unknown()).nullable().optional(),
});

const saveInput = z.object({
  parsed: parsedSchema,
  filename: z.string().max(255),
  fileType: FILE_TYPE,
  fileSize: z.number().int().min(0).default(0),
  match: z.boolean().default(false),
  feedback: z
    .object({
      rpe: z.number().int().min(1).max(10).nullable().optional(),
      pain_level: z.enum(["NONE", "MILD", "MODERATE", "SEVERE"]).nullable().optional(),
      fatigue_level: z.enum(["LOW", "NORMAL", "HIGH"]).nullable().optional(),
      sleep_quality: z.enum(["GOOD", "AVERAGE", "POOR"]).nullable().optional(),
      comment: z.string().max(500).nullable().optional(),
    })
    .optional(),
});

// ----- Save (with optional matching) -----
export const saveActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => saveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const p = data.parsed;

    const { data: activity, error: actErr } = await supabase
      .from("imported_activities")
      .insert({
        user_id: userId,
        source_type: "FILE_UPLOAD",
        original_filename: data.filename,
        file_type: data.fileType,
        activity_type: p.activity_type,
        start_time: p.start_time,
        timezone: p.timezone ?? null,
        duration_seconds: p.duration_seconds,
        moving_time_seconds: p.moving_time_seconds ?? null,
        distance_meters: p.distance_meters,
        average_pace_sec_per_km: p.average_pace_sec_per_km ?? null,
        average_speed_kmh: p.average_speed_kmh ?? null,
        average_heart_rate: p.average_heart_rate ?? null,
        max_heart_rate: p.max_heart_rate ?? null,
        elevation_gain_meters: p.elevation_gain_meters ?? null,
        average_cadence: p.average_cadence ?? null,
        calories: p.calories ?? null,
        raw_summary: p.raw_summary ?? null,
      })
      .select()
      .single();
    if (actErr) throw new Error(actErr.message);

    if (p.splits.length > 0) {
      const { error: spErr } = await supabase.from("activity_splits").insert(
        p.splits.map((s) => ({ ...s, imported_activity_id: activity.id })),
      );
      if (spErr) throw new Error(spErr.message);
    }

    await supabase.from("uploaded_activity_files").insert({
      user_id: userId,
      imported_activity_id: activity.id,
      original_filename: data.filename,
      file_type: data.fileType,
      file_size_bytes: data.fileSize,
      parsing_status: "PARSED",
    });

    if (data.feedback && (data.feedback.rpe || data.feedback.pain_level || data.feedback.fatigue_level || data.feedback.comment)) {
      await supabase.from("post_activity_feedback").insert({
        user_id: userId,
        imported_activity_id: activity.id,
        rpe: data.feedback.rpe ?? null,
        pain_level: data.feedback.pain_level ?? null,
        fatigue_level: data.feedback.fatigue_level ?? null,
        sleep_quality: data.feedback.sleep_quality ?? null,
        comment: data.feedback.comment ?? null,
      });
    }

    let matchResult: {
      workout_id: string;
      status: "AUTO_MATCHED" | "NEEDS_REVIEW";
      confidence: number;
      reason: string;
    } | null = null;

    if (data.match) {
      const dateIso = p.start_time.slice(0, 10);
      const startDate = new Date(dateIso + "T00:00:00");
      const dates: string[] = [];
      for (let i = -2; i <= 2; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().slice(0, 10));
      }
      const { data: workouts } = await supabase
        .from("workouts")
        .select("id, scheduled_date, workout_type, estimated_duration_minutes, status")
        .eq("user_id", userId)
        .in("scheduled_date", dates);

      const candidates = (workouts ?? []).filter(
        (w) => w.status !== "COMPLETED" && w.status !== "REPLACED",
      ) as MatchableWorkout[];

      const activityForMatch: MatchableActivity = {
        id: activity.id,
        start_time: activity.start_time,
        activity_type: activity.activity_type as any,
        duration_seconds: activity.duration_seconds,
        distance_meters: Number(activity.distance_meters),
        average_pace_sec_per_km: activity.average_pace_sec_per_km,
        splits_count: p.splits.length,
        avg_rpe: data.feedback?.rpe ?? null,
      };
      const best = findBestMatch(activityForMatch, candidates);
      if (best) {
        const status = decideStatus(best.score.confidence);
        if (status) {
          await supabase.from("workout_activity_matches").insert({
            user_id: userId,
            workout_id: best.workout.id,
            imported_activity_id: activity.id,
            match_status: status,
            confidence_score: best.score.confidence,
            match_reason: best.score.reason,
            distance_score: 0,
            time_score: best.score.duration_score,
            type_score: best.score.type_score,
            intensity_score: best.score.intensity_score,
          });
          matchResult = {
            workout_id: best.workout.id,
            status,
            confidence: best.score.confidence,
            reason: best.score.reason,
          };
          // If auto-matched, mark workout completed
          if (status === "AUTO_MATCHED") {
            await supabase
              .from("workouts")
              .update({ status: "COMPLETED" })
              .eq("id", best.workout.id);
          }
        }
      }
    }

    return { activity, match: matchResult };
  });

export const listActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: activities, error } = await supabase
      .from("imported_activities")
      .select("*")
      .eq("user_id", userId)
      .order("start_time", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    const { data: matches } = await supabase
      .from("workout_activity_matches")
      .select("*")
      .eq("user_id", userId);

    return { activities: activities ?? [], matches: matches ?? [] };
  });

export const manualMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ activityId: z.string().uuid(), workoutId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: activity } = await supabase
      .from("imported_activities")
      .select("*")
      .eq("id", data.activityId)
      .eq("user_id", userId)
      .single();
    const { data: workout } = await supabase
      .from("workouts")
      .select("*")
      .eq("id", data.workoutId)
      .eq("user_id", userId)
      .single();
    if (!activity || !workout) throw new Error("Not found");

    const score = scoreMatch(
      {
        id: workout.id,
        scheduled_date: workout.scheduled_date,
        workout_type: workout.workout_type as WorkoutType,
        estimated_duration_minutes: workout.estimated_duration_minutes,
        status: workout.status,
      },
      {
        id: activity.id,
        start_time: activity.start_time,
        activity_type: activity.activity_type as any,
        duration_seconds: activity.duration_seconds,
        distance_meters: Number(activity.distance_meters),
        average_pace_sec_per_km: activity.average_pace_sec_per_km,
      },
    );

    // Remove any existing match for the same pair, then insert as manual
    await supabase
      .from("workout_activity_matches")
      .delete()
      .eq("user_id", userId)
      .eq("workout_id", data.workoutId)
      .eq("imported_activity_id", data.activityId);

    const { error } = await supabase.from("workout_activity_matches").insert({
      user_id: userId,
      workout_id: data.workoutId,
      imported_activity_id: data.activityId,
      match_status: "MANUALLY_MATCHED",
      confidence_score: score.confidence,
      match_reason: score.reason || "Manual match",
      distance_score: 0,
      time_score: score.duration_score,
      type_score: score.type_score,
      intensity_score: score.intensity_score,
    });
    if (error) throw new Error(error.message);

    await supabase.from("workouts").update({ status: "COMPLETED" }).eq("id", data.workoutId);
    return { ok: true };
  });

export const unmatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ matchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("workout_activity_matches")
      .update({ match_status: "REJECTED" })
      .eq("id", data.matchId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPlannedVsActual = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: workouts }, { data: matches }, { data: activities }, { data: feedback }] = await Promise.all([
      supabase.from("workouts").select("*").eq("user_id", userId).order("scheduled_date"),
      supabase.from("workout_activity_matches").select("*").eq("user_id", userId),
      supabase.from("imported_activities").select("*").eq("user_id", userId),
      supabase.from("post_activity_feedback").select("*").eq("user_id", userId),
    ]);

    const actMap = new Map((activities ?? []).map((a) => [a.id, a]));
    const fbByAct = new Map((feedback ?? []).map((f) => [f.imported_activity_id, f]));
    const matchByWorkout = new Map<string, any>();
    for (const m of matches ?? []) {
      if (m.match_status === "REJECTED") continue;
      const cur = matchByWorkout.get(m.workout_id);
      if (!cur || m.confidence_score > cur.confidence_score) matchByWorkout.set(m.workout_id, m);
    }

    const rows = (workouts ?? []).map((w) => {
      const m = matchByWorkout.get(w.id);
      const activity = m ? actMap.get(m.imported_activity_id) : null;
      const fb = activity ? fbByAct.get(activity.id) : null;
      let compliance: ReturnType<typeof complianceScore> | null = null;
      if (activity) {
        compliance = complianceScore({
          workout_type: w.workout_type as WorkoutType,
          planned_duration_minutes: w.estimated_duration_minutes,
          actual_duration_seconds: activity.duration_seconds,
          rpe: fb?.rpe ?? null,
          has_splits: (activity.raw_summary as any)?.laps > 1 || false,
        });
      }
      return { workout: w, match: m ?? null, activity: activity ?? null, feedback: fb ?? null, compliance };
    });

    return { rows };
  });

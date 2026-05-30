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
import {
  upsertWorkoutComparison,
  actualFromImportedActivity,
} from "@/lib/activities/comparison.server";
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
        raw_summary: (p.raw_summary ?? null) as any,
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
          // Auto-write comparison for the planned/actual pair
          await upsertWorkoutComparison(
            supabase,
            userId,
            best.workout.id,
            actualFromImportedActivity(activity),
          );
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

// ----- Manual run entry (no file) -----
const manualRunInput = z.object({
  date: z.string(),              // YYYY-MM-DD
  time: z.string().optional(),   // HH:mm, optional, defaults to 12:00
  distance_km: z.number().positive().max(300),
  duration_min: z.number().positive().max(1000),
  average_hr: z.number().int().min(30).max(240).nullable().optional(),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(500).optional(),
  workout_id: z.string().uuid().nullable().optional(),
});

export const logManualRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => manualRunInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const time = data.time && /^\d{2}:\d{2}$/.test(data.time) ? data.time : "12:00";
    const startIso = new Date(`${data.date}T${time}:00`).toISOString();
    const duration_seconds = Math.round(data.duration_min * 60);
    const distance_meters = Math.round(data.distance_km * 1000);
    const average_pace_sec_per_km =
      data.distance_km > 0 ? Math.round(duration_seconds / data.distance_km) : null;

    const { data: activity, error } = await supabase
      .from("imported_activities")
      .insert({
        user_id: userId,
        source_type: "MANUAL_ENTRY",
        original_filename: null,
        file_type: "UNKNOWN",
        activity_type: "RUN",
        start_time: startIso,
        duration_seconds,
        distance_meters,
        average_pace_sec_per_km,
        average_heart_rate: data.average_hr ?? null,
        raw_summary: data.notes ? ({ notes: data.notes } as any) : null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (data.rpe || data.notes) {
      await supabase.from("post_activity_feedback").insert({
        user_id: userId,
        imported_activity_id: activity.id,
        rpe: data.rpe ?? null,
        comment: data.notes ?? null,
      });
    }

    // Optional manual link to a planned workout → triggers comparison
    if (data.workout_id) {
      // ensure workout belongs to user
      const { data: workout } = await supabase
        .from("workouts").select("id").eq("id", data.workout_id).eq("user_id", userId).maybeSingle();
      if (workout) {
        await supabase
          .from("workout_activity_matches")
          .delete()
          .eq("user_id", userId)
          .eq("workout_id", data.workout_id)
          .eq("imported_activity_id", activity.id);
        await supabase.from("workout_activity_matches").insert({
          user_id: userId,
          workout_id: data.workout_id,
          imported_activity_id: activity.id,
          match_status: "MANUALLY_MATCHED",
          confidence_score: 100,
          match_reason: "Manual entry — linked by user",
          distance_score: 0,
          time_score: 0,
          type_score: 0,
          intensity_score: 0,
        });
        await supabase.from("workouts").update({ status: "COMPLETED" }).eq("id", data.workout_id);
        await upsertWorkoutComparison(
          supabase,
          userId,
          data.workout_id,
          actualFromImportedActivity(activity),
        );
      }
    }

    return { activity };
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
    await upsertWorkoutComparison(supabase, userId, data.workoutId, actualFromImportedActivity(activity));
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

import { evaluateActuals, type ActualActivity } from "@/lib/training/actual-safety";

export const getActivitySummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date();
    since.setDate(since.getDate() - 21);

    const [{ data: activities }, { data: matches }, { data: workouts }, { data: feedback }] = await Promise.all([
      supabase.from("imported_activities").select("*").eq("user_id", userId)
        .gte("start_time", since.toISOString()).order("start_time", { ascending: false }),
      supabase.from("workout_activity_matches").select("*").eq("user_id", userId),
      supabase.from("workouts").select("id, workout_type").eq("user_id", userId),
      supabase.from("post_activity_feedback").select("*").eq("user_id", userId),
    ]);

    const workoutType = new Map((workouts ?? []).map((w) => [w.id, w.workout_type]));
    const matchByAct = new Map<string, any>();
    for (const m of matches ?? []) {
      if (m.match_status === "REJECTED") continue;
      const cur = matchByAct.get(m.imported_activity_id);
      if (!cur || m.confidence_score > cur.confidence_score) matchByAct.set(m.imported_activity_id, m);
    }
    const fbByAct = new Map((feedback ?? []).map((f) => [f.imported_activity_id, f]));

    const actuals: ActualActivity[] = (activities ?? []).map((a) => {
      const m = matchByAct.get(a.id);
      const fb = fbByAct.get(a.id);
      return {
        id: a.id,
        start_time: a.start_time,
        duration_seconds: a.duration_seconds,
        distance_meters: Number(a.distance_meters),
        matched_workout_type: m ? (workoutType.get(m.workout_id) as any) ?? null : null,
        rpe: fb?.rpe ?? null,
        pain_level: fb?.pain_level ?? null,
      };
    });

    // Weekly totals (last 7 days)
    const weekAgo = Date.now() - 7 * 86400000;
    const week = (activities ?? []).filter((a) => new Date(a.start_time).getTime() >= weekAgo);
    const weekDistanceKm = week.reduce((s, a) => s + Number(a.distance_meters) / 1000, 0);
    const weekDurationMin = week.reduce((s, a) => s + a.duration_seconds / 60, 0);
    const weekRpeLoad = week.reduce((s, a) => {
      const fb = fbByAct.get(a.id);
      return s + (a.duration_seconds / 60) * (fb?.rpe ?? 4);
    }, 0);

    const unmatchedCount = (activities ?? []).filter((a) => !matchByAct.get(a.id)).length;
    const needsReviewCount = Array.from(matchByAct.values()).filter((m) => m.match_status === "NEEDS_REVIEW").length;

    return {
      latest: activities?.[0] ?? null,
      unmatchedCount,
      needsReviewCount,
      weekDistanceKm: +weekDistanceKm.toFixed(2),
      weekDurationMin: Math.round(weekDurationMin),
      weekRpeLoad: Math.round(weekRpeLoad),
      actualWarnings: evaluateActuals(actuals),
      matchedWorkoutIds: Array.from(matchByAct.values()).map((m) => ({ id: m.workout_id, status: m.match_status })),
    };
  });

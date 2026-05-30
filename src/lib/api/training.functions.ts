import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPlanDraftsByWeek, scheduleWorkoutsToDates, mondayOf, addDays } from "@/lib/training/seed";
import { plannedRPE } from "@/lib/training/paces";
import { EQUIVALENTS, templateToDraft } from "@/lib/training/alternatives";
import { generateWorkout } from "@/lib/training/generator";
import {
  evaluateProposal,
  evaluatePlan,
  hasBlocking,
  type WorkoutSnapshot,
  type LastLog,
  type RuleWarning,
} from "@/lib/training/rules";
import { decideMissed } from "@/lib/training/missed";
import { recalibrateWeek, shouldRecalibrate, type RecalInput } from "@/lib/training/recalibration";
import type { WorkoutType } from "@/lib/training/types";
import { upsertWorkoutComparison, actualFromWorkoutLog } from "@/lib/activities/comparison.server";

const onboardingInput = z.object({
  name: z.string().min(1).max(60),
  age: z.number().int().min(10).max(99),
  vma_kmh: z.number().min(5).max(25),
  race_date: z.string(),
  sessions_per_week: z.number().int().min(3).max(4),
  preferred_days: z.array(z.string()).min(2).max(7),
  current_level: z.enum(["RETURNING", "REGULAR", "ADVANCED"]),
  cross_training_available: z.boolean(),
  target_10k_time: z.string().optional().nullable(),
});

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("athlete_profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => onboardingInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error: upErr } = await supabase.from("athlete_profiles").upsert({
      user_id: userId,
      name: data.name,
      age: data.age,
      vma_kmh: data.vma_kmh,
      race_date: data.race_date,
      sessions_per_week: data.sessions_per_week,
      preferred_days: data.preferred_days,
      current_level: data.current_level,
      cross_training_available: data.cross_training_available,
      target_10k_time: data.target_10k_time ?? null,
      onboarded: true,
    }, { onConflict: "user_id" });
    if (upErr) throw new Error(upErr.message);

    await supabase.from("training_plans").delete().eq("user_id", userId);

    const race = new Date(data.race_date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const raceAnchor = mondayOf(addDays(race, -7 * 11));
    const todayMonday = mondayOf(today);
    const startMonday = raceAnchor < todayMonday ? raceAnchor : todayMonday;

    const { data: plan, error: planErr } = await supabase
      .from("training_plans")
      .insert({
        user_id: userId,
        start_date: startMonday.toISOString().slice(0, 10),
        race_date: data.race_date,
        duration_weeks: 12,
        current_week: 1,
        status: "ACTIVE",
      })
      .select("*").single();
    if (planErr) throw new Error(planErr.message);

    const drafts = getPlanDraftsByWeek();
    const scheduled = scheduleWorkoutsToDates(drafts, startMonday, data.preferred_days, race);
    const rows = scheduled.map((d) => ({
      plan_id: plan.id,
      user_id: userId,
      week_number: d.week_number,
      scheduled_date: d.scheduled_date,
      workout_type: d.workout_type,
      title: d.title,
      objective: d.objective,
      warmup: d.warmup,
      main_set: d.main_set,
      recovery: d.recovery,
      cooldown: d.cooldown,
      target_vma_min_percent: d.target_vma_min_percent,
      target_vma_max_percent: d.target_vma_max_percent,
      estimated_duration_minutes: d.estimated_duration_minutes,
      estimated_load: Math.round(d.estimated_duration_minutes * plannedRPE(d.workout_type)),
      difficulty: d.difficulty,
      notes: d.notes ?? null,
      status: "PLANNED" as const,
    }));
    const { error: wErr } = await supabase.from("workouts").insert(rows);
    if (wErr) throw new Error(wErr.message);

    return { ok: true, planId: plan.id };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    name: z.string().min(1).max(60).optional(),
    age: z.number().int().min(10).max(99).optional(),
    sex: z.enum(["male", "female", "other"]).nullable().optional(),
    vma_kmh: z.number().min(5).max(25).optional(),
    race_date: z.string().optional(),
    objective_date: z.string().optional(),
    objective_type: z.enum(["5k", "10k", "semi", "marathon"]).optional(),
    current_level: z.enum(["RETURNING", "REGULAR", "ADVANCED"]).optional(),
    sessions_per_week: z.number().int().min(3).max(4).optional(),
    preferred_days: z.array(z.string()).min(2).max(7).optional(),
    target_10k_time: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("athlete_profiles").update(data).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("training_plans").delete().eq("user_id", userId);
    await supabase.from("athlete_profiles").update({ onboarded: false }).eq("user_id", userId);
    return { ok: true };
  });

// ---- Workouts ----

export const getPlanWorkouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: plan } = await supabase
      .from("training_plans").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!plan) return { plan: null, workouts: [], lastLog: null };
    const { data: workouts, error } = await supabase
      .from("workouts").select("*").eq("plan_id", plan.id)
      .order("scheduled_date", { ascending: true });
    if (error) throw new Error(error.message);
    const { data: lastLog } = await supabase
      .from("workout_logs").select("workout_id, pain_level, fatigue_level, completed_status, created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return { plan, workouts: workouts ?? [], lastLog: lastLog ?? null };
  });

export const getWorkout = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: w, error } = await supabase
      .from("workouts").select("*").eq("id", data.id).eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!w) throw new Error("Not found");
    const { data: log } = await supabase
      .from("workout_logs").select("*").eq("workout_id", w.id).maybeSingle();
    return { workout: w, log };
  });

// ---- Internal helpers (server-only) ----

async function loadPlanContext(supabase: any, userId: string) {
  const { data: plan } = await supabase.from("training_plans").select("*")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!plan) throw new Error("No active plan");
  const { data: workouts } = await supabase.from("workouts").select(
    "id, scheduled_date, workout_type, estimated_load, status, week_number, title, estimated_duration_minutes"
  ).eq("plan_id", plan.id);
  const { data: lastLog } = await supabase
    .from("workout_logs").select("workout_id, pain_level, fatigue_level, completed_status, created_at")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return {
    plan,
    workouts: (workouts ?? []) as Array<WorkoutSnapshot & { week_number: number; title: string; estimated_duration_minutes: number | null }>,
    lastLog: (lastLog ?? null) as LastLog | null,
  };
}

// ---- Preview / validation ----

export const previewPlanChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    kind: z.enum(["RESCHEDULE", "REPLACE", "GENERATE"]),
    workoutId: z.string().uuid().nullable(),
    scheduled_date: z.string(),
    workout_type: z.enum(["VMA_SHORT","VMA_LONG","THRESHOLD","TEN_K_PACE","EASY","LONG_RUN","RECOVERY","HILLS","TAPER","TEST","RACE"]),
    estimated_load: z.number().int().min(0).max(2000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ctx = await loadPlanContext(supabase, userId);
    const warnings = evaluateProposal(
      ctx.workouts.map((w) => ({
        id: w.id, scheduled_date: w.scheduled_date, workout_type: w.workout_type as WorkoutType,
        estimated_load: w.estimated_load, status: w.status,
      })),
      {
        workoutId: data.workoutId,
        scheduled_date: data.scheduled_date,
        workout_type: data.workout_type,
        estimated_load: data.estimated_load,
      },
      ctx.lastLog,
    );
    // For REPLACE specifically, prepend an INFO that the swap keeps stimulus
    if (data.kind === "REPLACE") {
      warnings.unshift({ severity: "INFO", code: "SAME_STIMULUS", message: "Same family — this replacement keeps the same physiological stimulus." });
    }
    return { warnings };
  });

// ---- Mutations with rule enforcement ----

const overrideInput = z.object({
  override: z.boolean().optional(),
  override_reason: z.string().max(300).optional(),
});

export const rescheduleWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    date: z.string(),
  }).merge(overrideInput).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ctx = await loadPlanContext(supabase, userId);
    const orig = ctx.workouts.find((w) => w.id === data.id);
    if (!orig) throw new Error("Workout not found");

    const warnings = evaluateProposal(
      ctx.workouts.map((w) => ({
        id: w.id, scheduled_date: w.scheduled_date, workout_type: w.workout_type as WorkoutType,
        estimated_load: w.estimated_load, status: w.status,
      })),
      {
        workoutId: data.id,
        scheduled_date: data.date,
        workout_type: orig.workout_type as WorkoutType,
        estimated_load: orig.estimated_load ?? 0,
      },
      ctx.lastLog,
    );
    if (hasBlocking(warnings) && !data.override) {
      throw new Error("BLOCKING: " + warnings.find((w) => w.severity === "BLOCKING")!.message);
    }
    const notesUpdate = data.override && hasBlocking(warnings)
      ? { override_reason: data.override_reason ?? "User overrode safety warning." }
      : null;

    // Recompute week_number from the new date so the calendar bucketing stays in sync.
    let newWeekNumber = orig.week_number;
    if (ctx.plan?.start_date) {
      const planStart = mondayOf(new Date(ctx.plan.start_date + "T00:00:00"));
      const targetMonday = mondayOf(new Date(data.date + "T00:00:00"));
      const diffDays = Math.floor((targetMonday.getTime() - planStart.getTime()) / 86400000);
      const computed = Math.floor(diffDays / 7) + 1;
      if (computed >= 1) newWeekNumber = computed;
    }

    const { error } = await supabase.from("workouts")
      .update({
        scheduled_date: data.date,
        week_number: newWeekNumber,
        status: "RESCHEDULED",
        ...(notesUpdate ? { notes: `[OVERRIDE] ${notesUpdate.override_reason}` } : {}),
      })
      .eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true, warnings };
  });

export const replaceWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    template_index: z.number().int().min(0),
  }).merge(overrideInput).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ctx = await loadPlanContext(supabase, userId);
    const orig = ctx.workouts.find((w) => w.id === data.id);
    if (!orig) throw new Error("Workout not found");
    const tpl = EQUIVALENTS[orig.workout_type as WorkoutType]?.[data.template_index];
    if (!tpl) throw new Error("Invalid alternative");
    const draft = templateToDraft(tpl, (orig as any).week_number ?? 1);

    const warnings = evaluateProposal(
      ctx.workouts.map((w) => ({
        id: w.id, scheduled_date: w.scheduled_date, workout_type: w.workout_type as WorkoutType,
        estimated_load: w.estimated_load, status: w.status,
      })),
      {
        workoutId: data.id, // treat as in-place change
        scheduled_date: orig.scheduled_date,
        workout_type: draft.workout_type,
        estimated_load: draft.estimated_load,
      },
      ctx.lastLog,
    );
    if (hasBlocking(warnings) && !data.override) {
      throw new Error("BLOCKING: " + warnings.find((w) => w.severity === "BLOCKING")!.message);
    }

    const { data: newRow, error: nErr } = await supabase.from("workouts").insert({
      plan_id: (orig as any).plan_id ?? null, // fallback
      user_id: userId,
      week_number: (orig as any).week_number ?? 1,
      scheduled_date: orig.scheduled_date,
      workout_type: draft.workout_type,
      title: draft.title,
      objective: draft.objective,
      warmup: draft.warmup,
      main_set: draft.main_set,
      recovery: draft.recovery,
      cooldown: draft.cooldown,
      target_vma_min_percent: draft.target_vma_min_percent,
      target_vma_max_percent: draft.target_vma_max_percent,
      estimated_duration_minutes: draft.estimated_duration_minutes,
      estimated_load: draft.estimated_load,
      difficulty: draft.difficulty,
      status: "PLANNED",
      notes: data.override && hasBlocking(warnings)
        ? `[OVERRIDE] ${data.override_reason ?? "User overrode safety warning."}`
        : null,
    }).select("*").single();
    if (nErr) throw new Error(nErr.message);

    // Need plan_id for replacement — fetch via direct query if missing
    if (!newRow.plan_id) {
      const { data: planRow } = await supabase
        .from("workouts").select("plan_id").eq("id", data.id).single();
      if (planRow) {
        await supabase.from("workouts").update({ plan_id: planRow.plan_id }).eq("id", newRow.id);
      }
    }
    await supabase.from("workouts").update({ status: "REPLACED", replaced_by_workout_id: newRow.id })
      .eq("id", data.id);
    return { ok: true, newId: newRow.id, warnings };
  });

export const generateAndSaveWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    type: z.enum(["VMA_SHORT","VMA_LONG","THRESHOLD","TEN_K_PACE","EASY","LONG_RUN","RECOVERY","HILLS","TAPER","TEST"]),
    availableTime: z.number().int().min(20).max(180),
    difficulty: z.enum(["EASIER", "NORMAL", "HARDER"]),
    terrain: z.enum(["ROAD","TRACK","TREADMILL","HILLY"]),
    monotony: z.enum(["CLASSIC","VARIED","PLAYFUL"]),
    scheduled_date: z.string(),
    save: z.boolean(),
  }).merge(overrideInput).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ctx = await loadPlanContext(supabase, userId);

    const start = new Date(ctx.plan.start_date + "T00:00:00");
    const sched = new Date(data.scheduled_date + "T00:00:00");
    const weekNum = Math.max(1, Math.min(12, Math.floor((sched.getTime() - start.getTime()) / (7 * 86400000)) + 1));

    const gen = generateWorkout({
      type: data.type, availableTime: data.availableTime, difficulty: data.difficulty,
      terrain: data.terrain, monotony: data.monotony, weekNumber: weekNum,
    });

    const warnings = evaluateProposal(
      ctx.workouts.map((w) => ({
        id: w.id, scheduled_date: w.scheduled_date, workout_type: w.workout_type as WorkoutType,
        estimated_load: w.estimated_load, status: w.status,
      })),
      {
        workoutId: null,
        scheduled_date: data.scheduled_date,
        workout_type: gen.workout_type,
        estimated_load: gen.estimated_load,
      },
      ctx.lastLog,
    );
    if (!data.save) return { preview: gen, warnings };

    if (hasBlocking(warnings) && !data.override) {
      throw new Error("BLOCKING: " + warnings.find((w) => w.severity === "BLOCKING")!.message);
    }

    const { data: row, error } = await supabase.from("workouts").insert({
      plan_id: ctx.plan.id, user_id: userId, week_number: weekNum,
      scheduled_date: data.scheduled_date,
      workout_type: gen.workout_type, title: gen.title, objective: gen.objective,
      warmup: gen.warmup, main_set: gen.main_set, recovery: gen.recovery, cooldown: gen.cooldown,
      target_vma_min_percent: gen.target_vma_min_percent,
      target_vma_max_percent: gen.target_vma_max_percent,
      estimated_duration_minutes: gen.estimated_duration_minutes,
      estimated_load: gen.estimated_load, difficulty: gen.difficulty,
      status: "PLANNED",
      notes: [
        ...gen.reasoning,
        data.override && hasBlocking(warnings) ? `[OVERRIDE] ${data.override_reason ?? "User overrode safety warning."}` : null,
      ].filter(Boolean).join(" • "),
    }).select("*").single();
    if (error) throw new Error(error.message);
    return { preview: gen, id: row.id, warnings };
  });

export const logWorkoutCompletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    workout_id: z.string().uuid(),
    completed_status: z.enum(["FULL", "PARTIAL", "NONE"]),
    actual_duration_minutes: z.number().min(0).max(600).optional(),
    actual_distance_km: z.number().min(0).max(100).optional(),
    average_pace: z.string().max(20).optional(),
    rpe: z.number().int().min(1).max(10),
    pain_level: z.enum(["NONE","MILD","MODERATE","SEVERE"]),
    fatigue_level: z.enum(["LOW","NORMAL","HIGH"]),
    sleep_quality: z.enum(["GOOD","AVERAGE","POOR"]),
    comment: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const load = Math.round((data.actual_duration_minutes ?? 0) * data.rpe);
    await supabase.from("workout_logs").delete().eq("workout_id", data.workout_id);
    const { data: logRow, error } = await supabase.from("workout_logs").insert({
      workout_id: data.workout_id, user_id: userId,
      completed_status: data.completed_status,
      actual_duration_minutes: data.actual_duration_minutes ?? null,
      actual_distance_km: data.actual_distance_km ?? null,
      average_pace: data.average_pace ?? null,
      rpe: data.rpe, pain_level: data.pain_level,
      fatigue_level: data.fatigue_level, sleep_quality: data.sleep_quality,
      comment: data.comment ?? null, calculated_load: load,
    }).select("*").single();
    if (error) throw new Error(error.message);
    const newStatus = data.completed_status === "FULL" ? "COMPLETED"
      : data.completed_status === "PARTIAL" ? "PARTIAL" : "MISSED";
    await supabase.from("workouts").update({ status: newStatus }).eq("id", data.workout_id);
    // Auto-write planned vs actual comparison when we have something to compare
    if (data.completed_status !== "NONE" && logRow) {
      await upsertWorkoutComparison(supabase, userId, data.workout_id, actualFromWorkoutLog(logRow));
    }
    return { ok: true };
  });

export const getWorkoutComparison = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workout_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows } = await supabase
      .from("workout_comparisons")
      .select("id, status, distance_delta_km, duration_delta_sec, pace_delta_sec_per_km, comment, completed_workout_id, completed_source_type, updated_at")
      .eq("user_id", userId)
      .eq("planned_workout_id", data.workout_id)
      .order("updated_at", { ascending: false })
      .limit(1);
    return { comparison: rows?.[0] ?? null };
  });

export const listWorkoutComparisons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: comparisons } = await supabase
      .from("workout_comparisons")
      .select("id, status, distance_delta_km, duration_delta_sec, pace_delta_sec_per_km, comment, planned_workout_id, completed_workout_id, completed_source_type, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    const ids = (comparisons ?? []).map((c: any) => c.planned_workout_id);
    if (ids.length === 0) return { rows: [] as any[] };
    const { data: workouts } = await supabase
      .from("workouts")
      .select("id, title, workout_type, scheduled_date, estimated_duration_minutes, target_pace_min, target_pace_max, target_distance_km")
      .in("id", ids);
    const wMap = new Map((workouts ?? []).map((w: any) => [w.id, w]));
    const rows = (comparisons ?? [])
      .map((c: any) => ({ comparison: c, workout: wMap.get(c.planned_workout_id) ?? null }))
      .filter((r) => r.workout);
    return { rows };
  });

export const getProgressData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: plan } = await supabase.from("training_plans").select("*")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!plan) return { plan: null, workouts: [], logs: [] };
    const [{ data: workouts }, { data: logs }] = await Promise.all([
      supabase.from("workouts").select("*").eq("plan_id", plan.id).order("scheduled_date"),
      supabase.from("workout_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);
    return { plan, workouts: workouts ?? [], logs: logs ?? [] };
  });

// ---- Dashboard warnings ----

export const getPlanWarnings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const ctx = await loadPlanContext(supabase, userId);
    const today = new Date().toISOString().slice(0, 10);
    const future = ctx.workouts.filter((w) => w.scheduled_date >= today);
    const warnings = evaluatePlan(
      future.map((w) => ({
        id: w.id, scheduled_date: w.scheduled_date, workout_type: w.workout_type as WorkoutType,
        estimated_load: w.estimated_load, status: w.status,
      })),
      ctx.lastLog,
    );
    return { warnings, lastLog: ctx.lastLog };
  });

// ---- Missed workout policy ----

export const getMissedDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workout_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ctx = await loadPlanContext(supabase, userId);
    const missed = ctx.workouts.find((w) => w.id === data.workout_id);
    if (!missed) throw new Error("Not found");
    const upcoming = ctx.workouts
      .filter((w) => w.scheduled_date > missed.scheduled_date && (w.status === "PLANNED" || w.status === "RESCHEDULED"))
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      .map((w) => ({ id: w.id, scheduled_date: w.scheduled_date, workout_type: w.workout_type as WorkoutType }));
    return {
      decision: decideMissed({
        missedType: missed.workout_type as WorkoutType,
        missedDate: missed.scheduled_date,
        upcoming,
      }),
    };
  });

// ---- Recalibration ----

export const previewRecalibration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ manualTrigger: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ctx = await loadPlanContext(supabase, userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monday = mondayOf(today);
    const weekStart = monday.toISOString().slice(0, 10);
    const weekEnd = addDays(monday, 6).toISOString().slice(0, 10);
    const inWeek = ctx.workouts.filter(
      (w) => w.scheduled_date >= weekStart && w.scheduled_date <= weekEnd,
    );
    const missedThisWeek = inWeek.filter((w) => w.status === "MISSED").length;

    const { data: recentLogs } = await supabase
      .from("workout_logs").select("fatigue_level, pain_level, created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(3);
    let highFatigueStreak = 0;
    for (const l of recentLogs ?? []) {
      if (l.fatigue_level === "HIGH") highFatigueStreak++;
      else break;
    }
    const hasPainFlag = (recentLogs ?? []).some(
      (l) => l.pain_level === "MODERATE" || l.pain_level === "SEVERE",
    );

    const recalInputs: RecalInput[] = inWeek.map((w) => ({
      id: w.id, scheduled_date: w.scheduled_date,
      workout_type: w.workout_type as WorkoutType,
      title: (w as any).title ?? "",
      estimated_duration_minutes: (w as any).estimated_duration_minutes ?? null,
      estimated_load: w.estimated_load, status: w.status,
    }));

    const proposal = recalibrateWeek({
      workouts: recalInputs,
      weekStart,
      missedThisWeek,
      highFatigueStreak,
      hasPainFlag,
      manualTrigger: data.manualTrigger,
    });
    return {
      proposal,
      triggers: shouldRecalibrate({
        workouts: recalInputs, weekStart, missedThisWeek, highFatigueStreak,
        hasPainFlag, manualTrigger: data.manualTrigger,
      }),
      originalWeek: recalInputs,
    };
  });

export const applyRecalibration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    actions: z.array(z.object({
      workoutId: z.string().uuid(),
      action: z.enum(["KEEP", "DOWNGRADE_TO_EASY", "REMOVE"]),
      new_type: z.enum(["EASY","HILLS","LONG_RUN","RACE","RECOVERY","TAPER","TEN_K_PACE","TEST","THRESHOLD","VMA_LONG","VMA_SHORT"]).optional(),
      new_title: z.string().optional(),
      new_main_set: z.string().optional(),
      new_duration: z.number().optional(),
      new_load: z.number().optional(),
    })),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    for (const a of data.actions) {
      if (a.action === "KEEP") continue;
      if (a.action === "REMOVE") {
        await supabase.from("workouts").update({ status: "REPLACED", notes: "[RECALIBRATED] Removed from week." })
          .eq("id", a.workoutId).eq("user_id", userId);
        continue;
      }
      // DOWNGRADE_TO_EASY
      await supabase.from("workouts").update({
        workout_type: a.new_type ?? "EASY",
        title: a.new_title ?? "Easy run",
        main_set: a.new_main_set ?? "Easy continuous",
        warmup: "Smooth easy start",
        recovery: "—",
        cooldown: "Stretch",
        objective: "Recalibrated — protect recovery, keep aerobic stimulus.",
        target_vma_min_percent: 65,
        target_vma_max_percent: 75,
        estimated_duration_minutes: a.new_duration ?? 40,
        estimated_load: a.new_load ?? 120,
        difficulty: 2,
        notes: "[RECALIBRATED] Hard session downgraded to easy.",
      }).eq("id", a.workoutId).eq("user_id", userId);
    }
    return { ok: true };
  });

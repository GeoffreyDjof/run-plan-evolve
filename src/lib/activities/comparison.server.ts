import { compareWorkout, paceStringToSec, type ComparisonInput } from "@/lib/activities/comparison";
import type { WorkoutType } from "@/lib/training/types";

type SupabaseLike = any;

interface PlannedSource {
  id: string;
  workout_type: string;
  target_distance_km: number | null;
  estimated_duration_minutes: number | null;
  target_pace_min: string | null;
  target_pace_max: string | null;
}

interface ActualSource {
  id: string; // imported_activity_id OR workout_log id
  distance_km: number | null;
  duration_sec: number | null;
  pace_sec_per_km: number | null;
}

/** Upsert a workout_comparison row for a planned/actual pair. Idempotent on (planned, completed). */
export async function upsertWorkoutComparison(
  supabase: SupabaseLike,
  userId: string,
  workoutId: string,
  actual: ActualSource,
): Promise<void> {
  // Load planned side
  const { data: w } = await supabase
    .from("workouts")
    .select("id, workout_type, target_distance_km, estimated_duration_minutes, target_pace_min, target_pace_max")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!w) return;
  const planned = w as PlannedSource;

  const input: ComparisonInput = {
    workout_type: planned.workout_type as WorkoutType,
    planned_distance_km: planned.target_distance_km != null ? Number(planned.target_distance_km) : null,
    planned_duration_min: planned.estimated_duration_minutes,
    planned_pace_min_sec: paceStringToSec(planned.target_pace_min),
    planned_pace_max_sec: paceStringToSec(planned.target_pace_max),
    actual_distance_km: actual.distance_km,
    actual_duration_sec: actual.duration_sec,
    actual_pace_sec: actual.pace_sec_per_km,
  };
  const result = compareWorkout(input);

  // Find existing row for the pair
  const { data: existing } = await supabase
    .from("workout_comparisons")
    .select("id")
    .eq("user_id", userId)
    .eq("planned_workout_id", workoutId)
    .eq("completed_workout_id", actual.id)
    .maybeSingle();

  const payload = {
    user_id: userId,
    planned_workout_id: workoutId,
    completed_workout_id: actual.id,
    distance_delta_km: result.distance_delta_km,
    duration_delta_sec: result.duration_delta_sec,
    pace_delta_sec_per_km: result.pace_delta_sec_per_km,
    status: result.status,
  };

  if (existing) {
    await supabase.from("workout_comparisons").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("workout_comparisons").insert(payload);
  }
}

/** Build ActualSource from an imported_activities row. */
export function actualFromImportedActivity(a: {
  id: string;
  distance_meters: number | string | null;
  duration_seconds: number | null;
  average_pace_sec_per_km: number | null;
}): ActualSource {
  return {
    id: a.id,
    distance_km: a.distance_meters != null ? Number(a.distance_meters) / 1000 : null,
    duration_sec: a.duration_seconds ?? null,
    pace_sec_per_km: a.average_pace_sec_per_km ?? null,
  };
}

/** Build ActualSource from a workout_logs row. */
export function actualFromWorkoutLog(l: {
  id: string;
  actual_distance_km: number | string | null;
  actual_duration_minutes: number | null;
  average_pace: string | null;
}): ActualSource {
  return {
    id: l.id,
    distance_km: l.actual_distance_km != null ? Number(l.actual_distance_km) : null,
    duration_sec: l.actual_duration_minutes != null ? l.actual_duration_minutes * 60 : null,
    pace_sec_per_km: paceStringToSec(l.average_pace),
  };
}

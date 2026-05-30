import type { WorkoutType } from "@/lib/training/types";
import { HARD_TYPES } from "@/lib/training/types";

export type ComparisonStatus = "on_track" | "too_fast" | "too_slow" | "incomplete" | "overdone";

export interface ComparisonInput {
  workout_type: WorkoutType;
  planned_distance_km: number | null;
  planned_duration_min: number | null;
  planned_pace_min_sec: number | null; // sec/km (fastest end of range)
  planned_pace_max_sec: number | null; // sec/km (slowest end of range)
  actual_distance_km: number | null;
  actual_duration_sec: number | null;
  actual_pace_sec: number | null; // sec/km
}

export interface ComparisonResult {
  distance_delta_km: number | null;
  duration_delta_sec: number | null;
  pace_delta_sec_per_km: number | null;
  status: ComparisonStatus;
  comment: string;
}

/** Parses "5:20" -> 320. Returns null on bad input. */
export function paceStringToSec(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function paceSecToString(sec: number | null | undefined): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Deterministic planned-vs-actual comparison.
 * Rules:
 *  - actual_distance < 80% planned   → incomplete
 *  - actual_distance > 120% planned  → overdone
 *  - easy + pace > 15s/km faster than target.min → too_fast
 *  - pace > 20s/km slower than target.max        → too_slow
 *  - else                                        → on_track
 */
export function compareWorkout(input: ComparisonInput): ComparisonResult {
  const distance_delta_km =
    input.planned_distance_km != null && input.actual_distance_km != null
      ? +(input.actual_distance_km - input.planned_distance_km).toFixed(2)
      : null;

  const duration_delta_sec =
    input.planned_duration_min != null && input.actual_duration_sec != null
      ? Math.round(input.actual_duration_sec - input.planned_duration_min * 60)
      : null;

  // Reference pace for delta: midpoint of target range when available
  const refPace =
    input.planned_pace_min_sec != null && input.planned_pace_max_sec != null
      ? (input.planned_pace_min_sec + input.planned_pace_max_sec) / 2
      : input.planned_pace_min_sec ?? input.planned_pace_max_sec ?? null;
  const pace_delta_sec_per_km =
    refPace != null && input.actual_pace_sec != null
      ? Math.round(input.actual_pace_sec - refPace)
      : null;

  // Status
  let status: ComparisonStatus = "on_track";
  const isEasy = input.workout_type === "EASY" || input.workout_type === "RECOVERY";

  if (input.planned_distance_km != null && input.actual_distance_km != null && input.planned_distance_km > 0) {
    const ratio = input.actual_distance_km / input.planned_distance_km;
    if (ratio < 0.8) status = "incomplete";
    else if (ratio > 1.2) status = "overdone";
  }

  if (status === "on_track" && input.actual_pace_sec != null) {
    if (isEasy && input.planned_pace_min_sec != null && input.actual_pace_sec < input.planned_pace_min_sec - 15) {
      status = "too_fast";
    } else if (input.planned_pace_max_sec != null && input.actual_pace_sec > input.planned_pace_max_sec + 20) {
      status = "too_slow";
    }
  }

  // Comment
  const parts: string[] = [];
  if (input.planned_distance_km != null && input.actual_distance_km != null) {
    parts.push(`Distance ${input.actual_distance_km.toFixed(2)} km / ${input.planned_distance_km.toFixed(2)} km prévu`);
  } else if (input.actual_distance_km != null) {
    parts.push(`Distance ${input.actual_distance_km.toFixed(2)} km`);
  }
  if (input.actual_duration_sec != null) {
    const min = Math.round(input.actual_duration_sec / 60);
    parts.push(input.planned_duration_min != null ? `Durée ${min}/${input.planned_duration_min} min` : `Durée ${min} min`);
  }
  if (input.actual_pace_sec != null) {
    const actualPaceStr = paceSecToString(input.actual_pace_sec) ?? "—";
    if (input.planned_pace_min_sec != null && input.planned_pace_max_sec != null) {
      parts.push(`Allure ${actualPaceStr} (cible ${paceSecToString(input.planned_pace_min_sec)}–${paceSecToString(input.planned_pace_max_sec)})`);
    } else {
      parts.push(`Allure ${actualPaceStr}`);
    }
  }
  if (HARD_TYPES.includes(input.workout_type) && input.workout_type !== "TEST") {
    parts.push("Structure précise (séries) non vérifiée");
  }

  return {
    distance_delta_km,
    duration_delta_sec,
    pace_delta_sec_per_km,
    status,
    comment: parts.join(" · "),
  };
}

export const COMPARISON_STATUS_LABEL: Record<ComparisonStatus, string> = {
  on_track: "Dans la cible",
  too_fast: "Trop rapide",
  too_slow: "Trop lent",
  incomplete: "Incomplet",
  overdone: "Au-dessus",
};

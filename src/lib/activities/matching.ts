import type { WorkoutType } from "@/lib/training/types";
import { HARD_TYPES } from "@/lib/training/types";
import type { ActivityKind } from "./types";

export interface MatchableWorkout {
  id: string;
  scheduled_date: string; // YYYY-MM-DD
  workout_type: WorkoutType;
  estimated_duration_minutes: number | null;
  status: string;
}

export interface MatchableActivity {
  id: string;
  start_time: string; // ISO
  activity_type: ActivityKind;
  duration_seconds: number;
  distance_meters: number;
  average_pace_sec_per_km: number | null;
  splits_count?: number;
  avg_rpe?: number | null;
}

export interface MatchScore {
  type_score: number;
  date_score: number;
  duration_score: number;
  intensity_score: number;
  confidence: number;
  reason: string;
}

function dayDiff(a: string, bIso: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(bIso.slice(0, 10) + "T00:00:00").getTime();
  return Math.round((db - da) / 86400000);
}

export function scoreMatch(w: MatchableWorkout, a: MatchableActivity): MatchScore {
  const reasons: string[] = [];
  // Type score
  let type_score = 0;
  if (a.activity_type === "RUN") {
    type_score = 40;
    reasons.push("Run vs planned run");
  } else if (w.workout_type === "EASY" && (a.activity_type === "WALK" || a.activity_type === "RIDE")) {
    type_score = 25;
    reasons.push("Cross-training accepted for easy session");
  }

  // Date score
  const diff = Math.abs(dayDiff(w.scheduled_date, a.start_time));
  let date_score = 0;
  if (diff === 0) { date_score = 30; reasons.push("Same day"); }
  else if (diff === 1) { date_score = 20; reasons.push("±1 day"); }
  else if (diff === 2) { date_score = 10; reasons.push("±2 days"); }

  // Duration score
  let duration_score = 0;
  const planned = (w.estimated_duration_minutes ?? 0) * 60;
  if (planned > 0 && a.duration_seconds > 0) {
    const ratio = a.duration_seconds / planned;
    if (ratio >= 0.85 && ratio <= 1.15) { duration_score = 15; reasons.push("Duration within ±15%"); }
    else if (ratio >= 0.7 && ratio <= 1.3) { duration_score = 8; reasons.push("Duration within ±30%"); }
  }

  // Intensity score
  let intensity_score = 0;
  const isHard = HARD_TYPES.includes(w.workout_type);
  if (w.workout_type === "EASY" || w.workout_type === "RECOVERY") {
    const easyish = (a.avg_rpe == null || a.avg_rpe <= 5);
    if (easyish) { intensity_score = 15; reasons.push("Easy effort matches easy plan"); }
  } else if (isHard) {
    if ((a.splits_count ?? 0) >= 2) { intensity_score = 15; reasons.push("Splits suggest intensity"); }
    else if (type_score && date_score) { intensity_score = 5; reasons.push("Intensity unknown (no split data)"); }
  } else if (type_score && date_score) {
    intensity_score = 5;
  }

  const confidence = type_score + date_score + duration_score + intensity_score;
  return { type_score, date_score, duration_score, intensity_score, confidence, reason: reasons.join(" · ") };
}

export type DecidedStatus = "AUTO_MATCHED" | "NEEDS_REVIEW" | null;

export function decideStatus(confidence: number): DecidedStatus {
  if (confidence >= 80) return "AUTO_MATCHED";
  if (confidence >= 50) return "NEEDS_REVIEW";
  return null;
}

export function findBestMatch(
  activity: MatchableActivity,
  candidates: MatchableWorkout[],
): { workout: MatchableWorkout; score: MatchScore } | null {
  let best: { workout: MatchableWorkout; score: MatchScore } | null = null;
  for (const w of candidates) {
    const score = scoreMatch(w, activity);
    if (!best || score.confidence > best.score.confidence) {
      best = { workout: w, score };
    }
  }
  return best;
}

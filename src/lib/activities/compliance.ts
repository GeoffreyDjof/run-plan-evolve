import type { WorkoutType } from "@/lib/training/types";
import { HARD_TYPES } from "@/lib/training/types";

export interface ComplianceInput {
  workout_type: WorkoutType;
  planned_duration_minutes: number | null;
  actual_duration_seconds: number;
  rpe?: number | null;
  has_splits: boolean;
}

export interface ComplianceResult {
  score: number; // 0-100
  band: "EXCELLENT" | "GOOD" | "ACCEPTABLE" | "DIVERGENT";
  notes: string[];
  confidence: "HIGH" | "LOW";
}

export function complianceScore(input: ComplianceInput): ComplianceResult {
  const notes: string[] = [];
  let score = 100;
  let confidence: "HIGH" | "LOW" = "HIGH";

  const planned = (input.planned_duration_minutes ?? 0) * 60;
  if (planned > 0 && input.actual_duration_seconds > 0) {
    const ratio = input.actual_duration_seconds / planned;
    const dev = Math.abs(1 - ratio);
    if (dev <= 0.05) {
      // perfect
    } else if (dev <= 0.15) {
      score -= 10;
      notes.push("Duration within ±15%");
    } else if (dev <= 0.3) {
      score -= 25;
      notes.push("Duration within ±30%");
    } else {
      score -= 40;
      notes.push("Duration off plan by more than 30%");
    }
  } else {
    score -= 10;
    notes.push("Duration not comparable");
  }

  const isHard = HARD_TYPES.includes(input.workout_type);
  const isEasy = input.workout_type === "EASY" || input.workout_type === "RECOVERY";

  if (isEasy) {
    // Don't penalize being slow if RPE is low
    if (input.rpe != null && input.rpe <= 5) {
      notes.push("Easy effort confirmed by RPE");
    } else if (input.rpe != null && input.rpe >= 8) {
      score -= 20;
      notes.push("Easy run ran too hard (high RPE)");
    }
  }

  if (isHard && !input.has_splits) {
    confidence = "LOW";
    score = Math.min(score, 70);
    notes.push("No split data; intensity confidence is low");
  }

  score = Math.max(0, Math.min(100, score));
  let band: ComplianceResult["band"];
  if (score >= 100) band = "EXCELLENT";
  else if (score >= 80) band = "GOOD";
  else if (score >= 60) band = "ACCEPTABLE";
  else band = "DIVERGENT";

  return { score, band, notes, confidence };
}

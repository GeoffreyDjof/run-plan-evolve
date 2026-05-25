export type WorkoutType =
  | "VMA_SHORT" | "VMA_LONG" | "THRESHOLD" | "TEN_K_PACE"
  | "EASY" | "LONG_RUN" | "RECOVERY" | "HILLS" | "TEST" | "TAPER" | "RACE";

export type WorkoutStatus =
  | "PLANNED" | "COMPLETED" | "PARTIAL" | "MISSED" | "RESCHEDULED" | "REPLACED";

export type RunnerLevel = "RETURNING" | "REGULAR" | "ADVANCED";
export type CompletionStatus = "FULL" | "PARTIAL" | "NONE";
export type PainLevel = "NONE" | "MILD" | "MODERATE" | "SEVERE";
export type FatigueLevel = "LOW" | "NORMAL" | "HIGH";
export type SleepQuality = "GOOD" | "AVERAGE" | "POOR";

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  VMA_SHORT: "VMA Short",
  VMA_LONG: "VMA Long",
  THRESHOLD: "Threshold",
  TEN_K_PACE: "10K Pace",
  EASY: "Easy",
  LONG_RUN: "Long Run",
  RECOVERY: "Recovery",
  HILLS: "Hills",
  TEST: "VMA Test",
  TAPER: "Taper",
  RACE: "Race Day",
};

export const HARD_TYPES: WorkoutType[] = ["VMA_SHORT", "VMA_LONG", "THRESHOLD", "TEN_K_PACE", "HILLS", "TEST"];

export interface WorkoutDraft {
  week_number: number;
  workout_type: WorkoutType;
  title: string;
  objective: string;
  warmup: string;
  main_set: string;
  recovery: string;
  cooldown: string;
  target_vma_min_percent: number;
  target_vma_max_percent: number;
  estimated_duration_minutes: number;
  difficulty: number;
  notes?: string;
}

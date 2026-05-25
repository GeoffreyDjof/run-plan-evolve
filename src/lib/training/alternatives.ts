import type { WorkoutType, WorkoutDraft } from "./types";
import { plannedRPE } from "./paces";

export interface AltTemplate {
  type: WorkoutType;
  title: string;
  warmup: string;
  main_set: string;
  recovery: string;
  cooldown: string;
  vma_min: number;
  vma_max: number;
  duration: number;
  difficulty: number;
  reason: string;
}

const WU = "15 min easy + 4 strides";
const CD = "10 min easy + mobility";

export const EQUIVALENTS: Record<WorkoutType, AltTemplate[]> = {
  VMA_SHORT: [
    { type: "VMA_SHORT", title: "30/30 × 12", warmup: WU, main_set: "12 × 30s on / 30s off @ 100–105% VMA", recovery: "30s easy between", cooldown: CD, vma_min: 100, vma_max: 105, duration: 50, difficulty: 4, reason: "Classic short VMA stimulus" },
    { type: "VMA_SHORT", title: "10 × 200 m", warmup: WU, main_set: "10 × 200m @ 105% VMA", recovery: "45s jog", cooldown: CD, vma_min: 102, vma_max: 105, duration: 50, difficulty: 4, reason: "Sharp VMA intervals" },
    { type: "VMA_SHORT", title: "8 × 300 m", warmup: WU, main_set: "8 × 300m @ 102% VMA", recovery: "1 min jog", cooldown: CD, vma_min: 100, vma_max: 103, duration: 55, difficulty: 4, reason: "Slightly longer reps, same family" },
    { type: "HILLS", title: "10 × 30s short hills", warmup: WU, main_set: "10 × 30s strong uphill", recovery: "walk down", cooldown: CD, vma_min: 100, vma_max: 110, duration: 50, difficulty: 4, reason: "Same neuromuscular load, lower impact" },
  ],
  VMA_LONG: [
    { type: "VMA_LONG", title: "5 × 3 min", warmup: WU, main_set: "5 × 3 min @ 95% VMA", recovery: "2 min jog", cooldown: CD, vma_min: 93, vma_max: 96, duration: 60, difficulty: 4, reason: "Standard VMA Long block" },
    { type: "VMA_LONG", title: "4 × 4 min", warmup: WU, main_set: "4 × 4 min @ 93% VMA", recovery: "2:30 jog", cooldown: CD, vma_min: 92, vma_max: 95, duration: 60, difficulty: 4, reason: "Slightly longer intervals" },
    { type: "VMA_LONG", title: "3 × 5 min", warmup: WU, main_set: "3 × 5 min @ 92% VMA", recovery: "3 min jog", cooldown: CD, vma_min: 90, vma_max: 94, duration: 60, difficulty: 4, reason: "Longer reps, same total time at VMA" },
    { type: "VMA_LONG", title: "6 × 800 m", warmup: WU, main_set: "6 × 800m @ 95% VMA", recovery: "2 min jog", cooldown: CD, vma_min: 93, vma_max: 96, duration: 60, difficulty: 4, reason: "Distance-based equivalent" },
    { type: "VMA_LONG", title: "5 × 1000 m", warmup: WU, main_set: "5 × 1000m @ 93% VMA", recovery: "2:30 jog", cooldown: CD, vma_min: 91, vma_max: 95, duration: 65, difficulty: 5, reason: "Longer distance reps" },
  ],
  THRESHOLD: [
    { type: "THRESHOLD", title: "2 × 12 min", warmup: WU, main_set: "2 × 12 min @ 85% VMA", recovery: "3 min jog", cooldown: CD, vma_min: 82, vma_max: 88, duration: 60, difficulty: 4, reason: "Long threshold blocks" },
    { type: "THRESHOLD", title: "3 × 10 min", warmup: WU, main_set: "3 × 10 min @ 85% VMA", recovery: "2 min jog", cooldown: CD, vma_min: 82, vma_max: 88, duration: 65, difficulty: 4, reason: "Standard threshold split" },
    { type: "THRESHOLD", title: "25 min Steady", warmup: WU, main_set: "25 min continuous @ 83% VMA", recovery: "—", cooldown: CD, vma_min: 80, vma_max: 85, duration: 55, difficulty: 3, reason: "Continuous threshold" },
    { type: "THRESHOLD", title: "4 × 8 min", warmup: WU, main_set: "4 × 8 min @ 86% VMA", recovery: "2 min jog", cooldown: CD, vma_min: 84, vma_max: 88, duration: 65, difficulty: 4, reason: "Shorter, slightly faster threshold" },
  ],
  TEN_K_PACE: [
    { type: "TEN_K_PACE", title: "5 × 1 km @ 10K", warmup: WU, main_set: "5 × 1 km @ 10K pace", recovery: "90s jog", cooldown: CD, vma_min: 88, vma_max: 91, duration: 60, difficulty: 4, reason: "Race-specific" },
    { type: "TEN_K_PACE", title: "3 × 2 km @ 10K", warmup: WU, main_set: "3 × 2 km @ 10K pace", recovery: "2:30 jog", cooldown: CD, vma_min: 88, vma_max: 91, duration: 70, difficulty: 5, reason: "Longer 10K reps" },
    { type: "TEN_K_PACE", title: "2 × 3 km @ 10K", warmup: WU, main_set: "2 × 3 km @ 10K pace", recovery: "3 min jog", cooldown: CD, vma_min: 88, vma_max: 91, duration: 70, difficulty: 5, reason: "Sustained race specificity" },
  ],
  EASY: [
    { type: "EASY", title: "45 min Easy", warmup: "—", main_set: "45 min easy continuous", recovery: "—", cooldown: "Stretch", vma_min: 65, vma_max: 75, duration: 45, difficulty: 2, reason: "Standard easy run" },
    { type: "EASY", title: "Zone 2 Bike 60 min", warmup: "10 min spin", main_set: "60 min zone 2 cycling", recovery: "—", cooldown: "5 min easy spin", vma_min: 60, vma_max: 70, duration: 75, difficulty: 2, reason: "Cross-training equivalent" },
    { type: "EASY", title: "Brisk Walk 50 min", warmup: "—", main_set: "50 min brisk walking", recovery: "—", cooldown: "—", vma_min: 50, vma_max: 60, duration: 50, difficulty: 1, reason: "Active recovery alternative" },
  ],
  LONG_RUN: [
    { type: "LONG_RUN", title: "70 min Easy Long Run", warmup: "Smooth start", main_set: "70 min easy continuous", recovery: "—", cooldown: "Walk + stretch", vma_min: 65, vma_max: 75, duration: 70, difficulty: 3, reason: "Classic long run" },
    { type: "LONG_RUN", title: "75 min Easy + 10 min Steady", warmup: "Smooth start", main_set: "65 min easy + 10 min steady @ 78% VMA", recovery: "—", cooldown: "Walk + stretch", vma_min: 65, vma_max: 80, duration: 75, difficulty: 4, reason: "Slightly progressive variant" },
  ],
  HILLS: [
    { type: "HILLS", title: "8 × 45s strong hills", warmup: WU, main_set: "8 × 45s hard uphill", recovery: "walk down", cooldown: CD, vma_min: 100, vma_max: 110, duration: 55, difficulty: 4, reason: "Hill intervals" },
  ],
  RECOVERY: [
    { type: "RECOVERY", title: "30 min Recovery Jog", warmup: "—", main_set: "30 min very easy", recovery: "—", cooldown: "Stretch", vma_min: 60, vma_max: 70, duration: 30, difficulty: 1, reason: "Active recovery" },
  ],
  TAPER: [
    { type: "TAPER", title: "30 min Easy + 4 Strides", warmup: "Easy start", main_set: "30 min easy + 4 × 80m strides", recovery: "—", cooldown: "Stretch", vma_min: 65, vma_max: 75, duration: 35, difficulty: 2, reason: "Pre-race shakeout" },
  ],
  TEST: [
    { type: "TEST", title: "6-min VMA Test", warmup: WU, main_set: "6 min max effort (track if possible)", recovery: "—", cooldown: CD, vma_min: 95, vma_max: 110, duration: 45, difficulty: 5, reason: "Maximal aerobic test" },
  ],
  RACE: [],
};

export function equivalentWorkouts(t: WorkoutType): AltTemplate[] {
  return EQUIVALENTS[t] ?? [];
}

export function templateToDraft(tpl: AltTemplate, weekNumber: number): WorkoutDraft & { estimated_load: number } {
  const load = Math.round(tpl.duration * plannedRPE(tpl.type));
  return {
    week_number: weekNumber,
    workout_type: tpl.type,
    title: tpl.title,
    objective: tpl.reason,
    warmup: tpl.warmup,
    main_set: tpl.main_set,
    recovery: tpl.recovery,
    cooldown: tpl.cooldown,
    target_vma_min_percent: tpl.vma_min,
    target_vma_max_percent: tpl.vma_max,
    estimated_duration_minutes: tpl.duration,
    difficulty: tpl.difficulty,
    estimated_load: load,
  };
}

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
  /** estimated RPE for this template (1-10) */
  rpe: number;
  difficulty: number;
  reason: string;
}

const WU = "15 min easy + 4 strides";
const WU_SHORT = "10 min easy + 3 strides";
const CD = "10 min easy + mobility";

/**
 * Alternative workout library. Same-family swaps that preserve the
 * physiological stimulus while varying structure, duration, or impact.
 */
export const EQUIVALENTS: Record<WorkoutType, AltTemplate[]> = {
  VMA_SHORT: [
    { type: "VMA_SHORT", title: "2 × 8 × 30s fast / 30s easy", warmup: WU, main_set: "2 sets of 8 × 30s @ 102% VMA / 30s easy. 3 min jog between sets.", recovery: "30s easy + 3 min between sets", cooldown: CD, vma_min: 100, vma_max: 104, duration: 55, rpe: 8, difficulty: 4, reason: "Two-block 30/30 — same neuromuscular stimulus split into manageable chunks." },
    { type: "VMA_SHORT", title: "10 × 45s fast / 45s easy", warmup: WU, main_set: "10 × 45s @ 100% VMA / 45s easy jog", recovery: "45s jog", cooldown: CD, vma_min: 98, vma_max: 102, duration: 55, rpe: 8, difficulty: 4, reason: "Slightly longer fast bursts — same family, more sustained VMA touch." },
    { type: "VMA_SHORT", title: "12 × 300 m", warmup: WU, main_set: "12 × 300m @ 102–105% VMA", recovery: "1 min jog", cooldown: CD, vma_min: 100, vma_max: 105, duration: 60, rpe: 8, difficulty: 4, reason: "Track-friendly distance reps at the same intensity." },
    { type: "VMA_SHORT", title: "8 × 200 m + 4 × 300 m", warmup: WU, main_set: "8 × 200m @ 105% VMA (45s jog) then 4 × 300m @ 102% VMA (75s jog)", recovery: "45–75s jog", cooldown: CD, vma_min: 100, vma_max: 105, duration: 60, rpe: 8, difficulty: 4, reason: "Pyramid feel — same stimulus, varied structure." },
    { type: "HILLS", title: "10 × 30s short hills", warmup: WU, main_set: "10 × 30s strong uphill, walk down", recovery: "walk down", cooldown: CD, vma_min: 100, vma_max: 110, duration: 50, rpe: 8, difficulty: 4, reason: "Lower-impact neuromuscular alternative — same family, easier on joints." },
  ],
  VMA_LONG: [
    { type: "VMA_LONG", title: "5 × 3 min", warmup: WU, main_set: "5 × 3 min @ 95% VMA", recovery: "2 min jog", cooldown: CD, vma_min: 93, vma_max: 96, duration: 60, rpe: 8, difficulty: 4, reason: "Classic VMA Long block — short reps at high quality." },
    { type: "VMA_LONG", title: "4 × 4 min", warmup: WU, main_set: "4 × 4 min @ 93% VMA", recovery: "2:30 jog", cooldown: CD, vma_min: 92, vma_max: 95, duration: 60, rpe: 8, difficulty: 4, reason: "Slightly longer intervals, same total time at intensity." },
    { type: "VMA_LONG", title: "5 × 4 min", warmup: WU, main_set: "5 × 4 min @ 93% VMA", recovery: "2:30 jog", cooldown: CD, vma_min: 92, vma_max: 95, duration: 70, rpe: 8, difficulty: 5, reason: "Higher volume version — only if last week tolerated well." },
    { type: "VMA_LONG", title: "5 × 5 min", warmup: WU, main_set: "5 × 5 min @ 92% VMA", recovery: "3 min jog", cooldown: CD, vma_min: 90, vma_max: 94, duration: 75, rpe: 8, difficulty: 5, reason: "Longest VMA-Long variant — peak phase only." },
    { type: "VMA_LONG", title: "6 × 800 m", warmup: WU, main_set: "6 × 800m @ 95% VMA", recovery: "2 min jog", cooldown: CD, vma_min: 93, vma_max: 96, duration: 65, rpe: 8, difficulty: 4, reason: "Distance-based equivalent at the same intensity." },
    { type: "VMA_LONG", title: "5 × 1000 m", warmup: WU, main_set: "5 × 1000m @ 93% VMA", recovery: "2:30 jog", cooldown: CD, vma_min: 91, vma_max: 95, duration: 70, rpe: 8, difficulty: 5, reason: "Longer distance reps — race-rhythm bias." },
  ],
  THRESHOLD: [
    { type: "THRESHOLD", title: "3 × 8 min", warmup: WU, main_set: "3 × 8 min @ 86% VMA", recovery: "2 min jog", cooldown: CD, vma_min: 84, vma_max: 88, duration: 60, rpe: 7, difficulty: 4, reason: "Shorter blocks at slightly faster threshold." },
    { type: "THRESHOLD", title: "3 × 10 min", warmup: WU, main_set: "3 × 10 min @ 85% VMA", recovery: "2 min jog", cooldown: CD, vma_min: 82, vma_max: 88, duration: 65, rpe: 7, difficulty: 4, reason: "Standard threshold split." },
    { type: "THRESHOLD", title: "2 × 15 min", warmup: WU, main_set: "2 × 15 min @ 84% VMA", recovery: "3 min jog", cooldown: CD, vma_min: 82, vma_max: 86, duration: 70, rpe: 7, difficulty: 5, reason: "Longer blocks — durability bias." },
    { type: "THRESHOLD", title: "25 min continuous tempo", warmup: WU, main_set: "25 min continuous @ 83% VMA", recovery: "—", cooldown: CD, vma_min: 80, vma_max: 85, duration: 55, rpe: 7, difficulty: 4, reason: "Continuous tempo — same stimulus, simpler structure." },
    { type: "THRESHOLD", title: "4 × 8 min", warmup: WU, main_set: "4 × 8 min @ 86% VMA", recovery: "2 min jog", cooldown: CD, vma_min: 84, vma_max: 88, duration: 70, rpe: 7, difficulty: 5, reason: "Higher-volume threshold." },
  ],
  TEN_K_PACE: [
    { type: "TEN_K_PACE", title: "5 × 1 km @ 10K", warmup: WU, main_set: "5 × 1 km @ 10K pace", recovery: "90s jog", cooldown: CD, vma_min: 88, vma_max: 91, duration: 60, rpe: 8, difficulty: 4, reason: "Race-specific — classic 1 km repeats." },
    { type: "TEN_K_PACE", title: "4 × 1.5 km @ 10K", warmup: WU, main_set: "4 × 1.5 km @ 10K pace", recovery: "2 min jog", cooldown: CD, vma_min: 88, vma_max: 91, duration: 70, rpe: 8, difficulty: 5, reason: "Longer reps at race pace — pacing skill." },
    { type: "TEN_K_PACE", title: "3 × 2 km @ 10K", warmup: WU, main_set: "3 × 2 km @ 10K pace", recovery: "2:30 jog", cooldown: CD, vma_min: 88, vma_max: 91, duration: 70, rpe: 8, difficulty: 5, reason: "Sustained race specificity." },
    { type: "TEN_K_PACE", title: "2 × 3 km @ 10K", warmup: WU, main_set: "2 × 3 km @ 10K pace", recovery: "3 min jog", cooldown: CD, vma_min: 88, vma_max: 91, duration: 70, rpe: 8, difficulty: 5, reason: "Peak-phase race-pace block." },
    { type: "TEN_K_PACE", title: "5 km continuous @ 10K", warmup: WU, main_set: "5 km continuous @ 10K pace", recovery: "—", cooldown: CD, vma_min: 88, vma_max: 91, duration: 60, rpe: 8, difficulty: 5, reason: "Dress rehearsal — half the race at race effort." },
  ],
  EASY: [
    { type: "EASY", title: "35–50 min easy run", warmup: "—", main_set: "40 min easy continuous (conversational)", recovery: "—", cooldown: "Stretch", vma_min: 65, vma_max: 75, duration: 45, rpe: 3, difficulty: 2, reason: "Standard easy run — easy means easy." },
    { type: "EASY", title: "Zone 2 bike 60 min", warmup: "10 min spin", main_set: "60 min zone 2 cycling (conversational)", recovery: "—", cooldown: "5 min easy spin", vma_min: 60, vma_max: 70, duration: 75, rpe: 3, difficulty: 2, reason: "Cross-training — same aerobic stimulus without impact." },
    { type: "EASY", title: "Brisk walk 50 min", warmup: "—", main_set: "50 min brisk walking", recovery: "—", cooldown: "—", vma_min: 50, vma_max: 60, duration: 50, rpe: 2, difficulty: 1, reason: "Active recovery alternative — keep blood moving without load." },
    { type: "RECOVERY", title: "30 min recovery jog", warmup: "—", main_set: "30 min very easy jog", recovery: "—", cooldown: "Stretch", vma_min: 60, vma_max: 70, duration: 30, rpe: 2, difficulty: 1, reason: "Light recovery — finish fresher than you started." },
  ],
  LONG_RUN: [
    { type: "LONG_RUN", title: "Easy long run", warmup: "Smooth start", main_set: "70 min easy continuous", recovery: "—", cooldown: "Walk + stretch", vma_min: 65, vma_max: 75, duration: 70, rpe: 5, difficulty: 3, reason: "Classic easy long run." },
    { type: "LONG_RUN", title: "Easy long run + 10–15 min steady finish", warmup: "Smooth start", main_set: "60 min easy + 12 min steady @ 78% VMA", recovery: "—", cooldown: "Walk + stretch", vma_min: 65, vma_max: 80, duration: 75, rpe: 5, difficulty: 4, reason: "Slightly progressive — durability finish." },
    { type: "EASY", title: "Shorter long run if fatigue is high", warmup: "Smooth start", main_set: "50 min easy continuous", recovery: "—", cooldown: "Walk + stretch", vma_min: 65, vma_max: 75, duration: 50, rpe: 4, difficulty: 2, reason: "Trimmed long run when fatigue is elevated." },
  ],
  HILLS: [
    { type: "HILLS", title: "8 × 45s strong hills", warmup: WU, main_set: "8 × 45s hard uphill, walk down", recovery: "walk down", cooldown: CD, vma_min: 100, vma_max: 110, duration: 55, rpe: 8, difficulty: 4, reason: "Hill intervals — strength + economy." },
    { type: "HILLS", title: "10 × 30s short hills", warmup: WU_SHORT, main_set: "10 × 30s strong uphill, walk down", recovery: "walk down", cooldown: CD, vma_min: 100, vma_max: 110, duration: 50, rpe: 7, difficulty: 4, reason: "Shorter reps — same family, less total stress." },
    { type: "VMA_SHORT", title: "30/30 × 12 (flat)", warmup: WU, main_set: "12 × 30s @ 102% VMA / 30s easy", recovery: "30s easy", cooldown: CD, vma_min: 100, vma_max: 105, duration: 50, rpe: 8, difficulty: 4, reason: "Flat alternative if no hills available — same neuromuscular family." },
  ],
  RECOVERY: [
    { type: "RECOVERY", title: "30 min recovery jog", warmup: "—", main_set: "30 min very easy", recovery: "—", cooldown: "Stretch", vma_min: 60, vma_max: 70, duration: 30, rpe: 2, difficulty: 1, reason: "Active recovery." },
    { type: "EASY", title: "Brisk walk 40 min", warmup: "—", main_set: "40 min brisk walking", recovery: "—", cooldown: "—", vma_min: 50, vma_max: 60, duration: 40, rpe: 2, difficulty: 1, reason: "Walk recovery — keep it gentle." },
  ],
  TAPER: [
    { type: "TAPER", title: "30 min easy + 4 strides", warmup: "Easy start", main_set: "30 min easy + 4 × 80m strides", recovery: "—", cooldown: "Stretch", vma_min: 65, vma_max: 75, duration: 35, rpe: 3, difficulty: 2, reason: "Pre-race shakeout." },
    { type: "TAPER", title: "25 min very easy + 4 accelerations", warmup: "Very easy", main_set: "25 min easy + 4 × 60m smooth accelerations", recovery: "—", cooldown: "Walk", vma_min: 65, vma_max: 72, duration: 30, rpe: 2, difficulty: 2, reason: "Shorter, even gentler taper option." },
  ],
  TEST: [
    { type: "TEST", title: "6-min VMA test", warmup: WU, main_set: "6 min max effort on track or flat road", recovery: "—", cooldown: CD, vma_min: 95, vma_max: 110, duration: 45, rpe: 9, difficulty: 5, reason: "Maximal aerobic test — recalibrate zones." },
  ],
  RACE: [],
};

export function equivalentWorkouts(t: WorkoutType): AltTemplate[] {
  return EQUIVALENTS[t] ?? [];
}

export function templateToDraft(
  tpl: AltTemplate,
  weekNumber: number,
): WorkoutDraft & { estimated_load: number; rpe: number } {
  const load = Math.round(tpl.duration * (tpl.rpe ?? plannedRPE(tpl.type)));
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
    rpe: tpl.rpe,
  };
}

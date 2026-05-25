import type { WorkoutDraft, WorkoutType } from "./types";
import { plannedRPE } from "./paces";

interface RawSession {
  type: WorkoutType;
  title: string;
  objective: string;
  warmup: string;
  main_set: string;
  recovery: string;
  cooldown: string;
  vma_min: number;
  vma_max: number;
  duration: number;
  difficulty: number;
  notes?: string;
}

const WU = "15 min easy running progressively + 4 strides of 80m";
const CD = "10 min very easy + light mobility";
const SHORT_WU = "10 min easy + 3 strides";

// Per spec: 3 sessions per week + optional 4th easy
const PLAN: RawSession[][] = [
  // Week 1
  [
    { type: "VMA_LONG", title: "5 × 3 min VMA", objective: "Build aerobic ceiling at 92–95% VMA",
      warmup: WU, main_set: "5 × 3 min @ 92–95% VMA", recovery: "2 min jog between reps", cooldown: CD,
      vma_min: 92, vma_max: 95, duration: 55, difficulty: 4 },
    { type: "THRESHOLD", title: "3 × 8 min Threshold", objective: "Lactate clearance",
      warmup: WU, main_set: "3 × 8 min @ 82–88% VMA", recovery: "2 min jog between reps", cooldown: CD,
      vma_min: 82, vma_max: 88, duration: 60, difficulty: 4 },
    { type: "LONG_RUN", title: "60 min Easy Long Run", objective: "Aerobic base",
      warmup: "Smooth start", main_set: "60 min continuous easy", recovery: "—", cooldown: "Walk + stretch",
      vma_min: 65, vma_max: 75, duration: 60, difficulty: 3 },
  ],
  // Week 2
  [
    { type: "VMA_LONG", title: "4 × 4 min VMA", objective: "Aerobic ceiling",
      warmup: WU, main_set: "4 × 4 min @ 92–95% VMA", recovery: "2:30 jog", cooldown: CD,
      vma_min: 92, vma_max: 95, duration: 60, difficulty: 4 },
    { type: "THRESHOLD", title: "2 × 12 min Threshold", objective: "Sustained lactate threshold",
      warmup: WU, main_set: "2 × 12 min @ 82–88% VMA", recovery: "3 min jog", cooldown: CD,
      vma_min: 82, vma_max: 88, duration: 65, difficulty: 4 },
    { type: "LONG_RUN", title: "65 min Easy Long Run", objective: "Aerobic base",
      warmup: "Smooth start", main_set: "65 min continuous easy", recovery: "—", cooldown: "Walk + stretch",
      vma_min: 65, vma_max: 75, duration: 65, difficulty: 3 },
  ],
  // Week 3
  [
    { type: "VMA_LONG", title: "5 × 4 min VMA", objective: "Aerobic ceiling – progression",
      warmup: WU, main_set: "5 × 4 min @ 92–95% VMA", recovery: "2:30 jog", cooldown: CD,
      vma_min: 92, vma_max: 95, duration: 70, difficulty: 5 },
    { type: "THRESHOLD", title: "3 × 10 min Threshold", objective: "Lactate threshold volume",
      warmup: WU, main_set: "3 × 10 min @ 82–88% VMA", recovery: "2 min jog", cooldown: CD,
      vma_min: 82, vma_max: 88, duration: 70, difficulty: 5 },
    { type: "LONG_RUN", title: "70 min Easy Long Run", objective: "Aerobic base",
      warmup: "Smooth start", main_set: "70 min continuous easy", recovery: "—", cooldown: "Walk + stretch",
      vma_min: 65, vma_max: 75, duration: 70, difficulty: 3 },
  ],
  // Week 4 — RECOVERY
  [
    { type: "VMA_SHORT", title: "8 × 1 min VMA Short", objective: "Light VMA touch – recovery week",
      warmup: SHORT_WU, main_set: "8 × 1 min @ 100% VMA", recovery: "1 min jog", cooldown: CD,
      vma_min: 100, vma_max: 102, duration: 45, difficulty: 3, notes: "Recovery week – keep it crisp not maxed" },
    { type: "THRESHOLD", title: "25 min Progressive Tempo", objective: "Smooth threshold progression",
      warmup: WU, main_set: "25 min progressive 80% → 87% VMA", recovery: "—", cooldown: CD,
      vma_min: 80, vma_max: 87, duration: 55, difficulty: 3 },
    { type: "LONG_RUN", title: "55 min Easy Run", objective: "Recovery long run",
      warmup: "Smooth start", main_set: "55 min easy", recovery: "—", cooldown: "Walk + stretch",
      vma_min: 65, vma_max: 75, duration: 55, difficulty: 2 },
  ],
  // Week 5
  [
    { type: "VMA_LONG", title: "5 × 5 min VMA", objective: "Aerobic ceiling – peak phase begin",
      warmup: WU, main_set: "5 × 5 min @ 92–95% VMA", recovery: "2:30 jog", cooldown: CD,
      vma_min: 92, vma_max: 95, duration: 75, difficulty: 5 },
    { type: "TEN_K_PACE", title: "4 × 6 min @ 10K Pace", objective: "Race specificity",
      warmup: WU, main_set: "4 × 6 min @ 10K pace", recovery: "2 min jog", cooldown: CD,
      vma_min: 88, vma_max: 91, duration: 65, difficulty: 4 },
    { type: "LONG_RUN", title: "70 min Easy Long Run", objective: "Aerobic base",
      warmup: "Smooth start", main_set: "70 min easy", recovery: "—", cooldown: "Walk + stretch",
      vma_min: 65, vma_max: 75, duration: 70, difficulty: 3 },
  ],
  // Week 6
  [
    { type: "VMA_SHORT", title: "10 × 400 m VMA Short", objective: "Top-end speed & economy",
      warmup: WU, main_set: "10 × 400m @ 100–102% VMA", recovery: "1 min jog", cooldown: CD,
      vma_min: 100, vma_max: 102, duration: 60, difficulty: 5 },
    { type: "THRESHOLD", title: "2 × 15 min Threshold", objective: "Sustained threshold strength",
      warmup: WU, main_set: "2 × 15 min @ 82–88% VMA", recovery: "3 min jog", cooldown: CD,
      vma_min: 82, vma_max: 88, duration: 70, difficulty: 5 },
    { type: "LONG_RUN", title: "75 min Easy Long Run", objective: "Aerobic base",
      warmup: "Smooth start", main_set: "75 min easy", recovery: "—", cooldown: "Walk + stretch",
      vma_min: 65, vma_max: 75, duration: 75, difficulty: 3 },
  ],
  // Week 7
  [
    { type: "VMA_LONG", title: "6 × 3 min VMA", objective: "Aerobic ceiling at high intensity",
      warmup: WU, main_set: "6 × 3 min @ 97–100% VMA", recovery: "2 min jog", cooldown: CD,
      vma_min: 97, vma_max: 100, duration: 65, difficulty: 5 },
    { type: "TEN_K_PACE", title: "5 × 1 km @ 10K Pace", objective: "Race-pace specificity",
      warmup: WU, main_set: "5 × 1 km @ 10K pace", recovery: "90s jog", cooldown: CD,
      vma_min: 88, vma_max: 91, duration: 65, difficulty: 5 },
    { type: "LONG_RUN", title: "75 min with 15 min Steady", objective: "Endurance + tempo finish",
      warmup: "Smooth start", main_set: "60 min easy + 15 min steady @ 78% VMA", recovery: "—", cooldown: "Walk + stretch",
      vma_min: 65, vma_max: 80, duration: 75, difficulty: 4 },
  ],
  // Week 8 — RECOVERY
  [
    { type: "VMA_LONG", title: "6 × 2 min VMA", objective: "Touch VMA – recovery week",
      warmup: WU, main_set: "6 × 2 min @ 95–100% VMA", recovery: "2 min jog", cooldown: CD,
      vma_min: 95, vma_max: 100, duration: 55, difficulty: 4, notes: "Recovery week" },
    { type: "THRESHOLD", title: "25 min Comfortable Threshold", objective: "Easy threshold touch",
      warmup: WU, main_set: "25 min @ 82–85% VMA", recovery: "—", cooldown: CD,
      vma_min: 82, vma_max: 85, duration: 55, difficulty: 3 },
    { type: "LONG_RUN", title: "60 min Easy Long Run", objective: "Recovery aerobic",
      warmup: "Smooth start", main_set: "60 min easy", recovery: "—", cooldown: "Walk + stretch",
      vma_min: 65, vma_max: 75, duration: 60, difficulty: 2 },
  ],
  // Week 9
  [
    { type: "VMA_LONG", title: "4 × 5 min VMA", objective: "Sustained VMA work",
      warmup: WU, main_set: "4 × 5 min @ 95% VMA", recovery: "2:30 jog", cooldown: CD,
      vma_min: 93, vma_max: 96, duration: 70, difficulty: 5 },
    { type: "TEN_K_PACE", title: "3 × 2 km @ 10K Pace", objective: "Race-pace endurance",
      warmup: WU, main_set: "3 × 2 km @ 10K pace", recovery: "2:30 jog", cooldown: CD,
      vma_min: 88, vma_max: 91, duration: 70, difficulty: 5 },
    { type: "LONG_RUN", title: "70 min Easy Long Run", objective: "Aerobic base",
      warmup: "Smooth start", main_set: "70 min easy", recovery: "—", cooldown: "Walk + stretch",
      vma_min: 65, vma_max: 75, duration: 70, difficulty: 3 },
  ],
  // Week 10
  [
    { type: "VMA_SHORT", title: "12 × 300 m VMA Short", objective: "Speed & economy peak",
      warmup: WU, main_set: "12 × 300m @ 102–105% VMA", recovery: "1 min jog", cooldown: CD,
      vma_min: 102, vma_max: 105, duration: 60, difficulty: 5 },
    { type: "TEN_K_PACE", title: "2 × 3 km @ 10K Pace", objective: "Sustained race specificity",
      warmup: WU, main_set: "2 × 3 km @ 10K pace", recovery: "3 min jog", cooldown: CD,
      vma_min: 88, vma_max: 91, duration: 70, difficulty: 5 },
    { type: "LONG_RUN", title: "65 min Easy Long Run", objective: "Aerobic base – holding",
      warmup: "Smooth start", main_set: "65 min easy", recovery: "—", cooldown: "Walk + stretch",
      vma_min: 65, vma_max: 75, duration: 65, difficulty: 3 },
  ],
  // Week 11
  [
    { type: "VMA_LONG", title: "5 × 3 min VMA – sharp", objective: "Sharpen VMA before taper",
      warmup: WU, main_set: "5 × 3 min @ 97–100% VMA", recovery: "2 min jog", cooldown: CD,
      vma_min: 97, vma_max: 100, duration: 60, difficulty: 5 },
    { type: "TEN_K_PACE", title: "5 km Continuous @ 10K Pace", objective: "Race-specific dress rehearsal",
      warmup: WU, main_set: "5 km steady @ 10K pace", recovery: "—", cooldown: CD,
      vma_min: 88, vma_max: 91, duration: 60, difficulty: 5 },
    { type: "LONG_RUN", title: "55–60 min Easy", objective: "Endurance maintained",
      warmup: "Smooth start", main_set: "55–60 min easy", recovery: "—", cooldown: "Walk + stretch",
      vma_min: 65, vma_max: 75, duration: 58, difficulty: 3 },
  ],
  // Week 12 — TAPER + RACE
  [
    { type: "TAPER", title: "45 min Easy + 6 Strides", objective: "Light taper opener",
      warmup: "Smooth easy start", main_set: "45 min easy + 6 × 80m strides", recovery: "—", cooldown: "Walk + stretch",
      vma_min: 65, vma_max: 75, duration: 50, difficulty: 3 },
    { type: "TEN_K_PACE", title: "3 × 1 km @ 10K Pace", objective: "Race-pace primer",
      warmup: WU, main_set: "3 × 1 km @ 10K pace", recovery: "2 min jog", cooldown: CD,
      vma_min: 88, vma_max: 91, duration: 50, difficulty: 4 },
    { type: "TAPER", title: "25–30 min Very Easy + 4 Strides", objective: "Pre-race shakeout",
      warmup: "Very easy", main_set: "25–30 min very easy + 4 × 60m accelerations", recovery: "—", cooldown: "Walk + stretch",
      vma_min: 65, vma_max: 72, duration: 30, difficulty: 2 },
    { type: "RACE", title: "10K Race Day", objective: "Race your best 10K",
      warmup: "20 min easy + 4 strides + drills", main_set: "10 km race effort", recovery: "—", cooldown: "10 min walk + stretch",
      vma_min: 88, vma_max: 92, duration: 60, difficulty: 5, notes: "Race day! Trust the plan." },
  ],
];

export function getPlanDraftsByWeek(): WorkoutDraft[][] {
  return PLAN.map((week, i) =>
    week.map((s) => ({
      week_number: i + 1,
      workout_type: s.type,
      title: s.title,
      objective: s.objective,
      warmup: s.warmup,
      main_set: s.main_set,
      recovery: s.recovery,
      cooldown: s.cooldown,
      target_vma_min_percent: s.vma_min,
      target_vma_max_percent: s.vma_max,
      estimated_duration_minutes: s.duration,
      difficulty: s.difficulty,
      notes: s.notes,
    })),
  );
}

const DAY_INDEX: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };

/** Schedule workouts to specific dates within a week given preferred days and start date.
 *  startDate = first Monday of week 1. Race day = last day of week 12. */
export function scheduleWorkoutsToDates(
  weeks: WorkoutDraft[][],
  startDate: Date,
  preferredDays: string[],
  raceDate: Date,
): (WorkoutDraft & { scheduled_date: string })[] {
  const result: (WorkoutDraft & { scheduled_date: string })[] = [];
  // ensure preferred days are sorted by day-of-week starting Monday
  const ordered = [...preferredDays].sort((a, b) => {
    const ai = DAY_INDEX[a] === 0 ? 7 : DAY_INDEX[a];
    const bi = DAY_INDEX[b] === 0 ? 7 : DAY_INDEX[b];
    return ai - bi;
  });

  weeks.forEach((weekDrafts, wi) => {
    const isLast = wi === weeks.length - 1;
    const monday = addDays(startDate, wi * 7);
    weekDrafts.forEach((d, di) => {
      // race day pinned to raceDate
      if (d.workout_type === "RACE") {
        result.push({ ...d, scheduled_date: toISO(raceDate) });
        return;
      }
      // Distribute drafts onto preferred days; if more drafts than days, fall back to spread
      const dayName = ordered[di % ordered.length] ?? "Tue";
      let dayOfWeek = DAY_INDEX[dayName] ?? 2;
      if (dayOfWeek === 0) dayOfWeek = 7;
      let date = addDays(monday, dayOfWeek - 1);
      // Last week non-race sessions must be before raceDate
      if (isLast && date >= raceDate) {
        date = addDays(raceDate, -2 + di);
      }
      result.push({ ...d, scheduled_date: toISO(date) });
    });
  });
  return result;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
/** Most recent Monday on/before date */
export function mondayOf(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay(); // Sun=0, Mon=1...
  const offset = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + offset);
  x.setHours(0, 0, 0, 0);
  return x;
}

export { plannedRPE };

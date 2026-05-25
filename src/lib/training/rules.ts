import type { WorkoutType } from "./types";
import { HARD_TYPES } from "./types";

export type Severity = "INFO" | "WARNING" | "BLOCKING";

export interface RuleWarning {
  severity: Severity;
  code: string;
  message: string;
}

export interface WorkoutSnapshot {
  id: string;
  scheduled_date: string; // YYYY-MM-DD
  workout_type: WorkoutType;
  estimated_load: number | null;
  status: string;
}

export interface LastLog {
  workout_id: string;
  pain_level: "NONE" | "MILD" | "MODERATE" | "SEVERE" | null;
  fatigue_level: "LOW" | "NORMAL" | "HIGH" | null;
  completed_status: "FULL" | "PARTIAL" | "NONE";
}

export interface ChangeProposal {
  /** id of the workout being modified, or null for newly generated/created */
  workoutId: string | null;
  /** new (or proposed) scheduled date */
  scheduled_date: string;
  /** new (or proposed) workout type */
  workout_type: WorkoutType;
  /** new (or proposed) estimated load (minutes × RPE) */
  estimated_load: number;
}

export function isHard(t: WorkoutType): boolean {
  return HARD_TYPES.includes(t);
}

function daysBetween(a: string, b: string): number {
  return Math.abs(
    (new Date(a + "T00:00:00").getTime() - new Date(b + "T00:00:00").getTime()) / 86400000,
  );
}

function isoWeekKey(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** Sum estimated_load by ISO-week start (Mon). Ignores workouts marked REPLACED. */
export function weeklyLoadsByWeekStart(
  workouts: WorkoutSnapshot[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const w of workouts) {
    if (w.status === "REPLACED") continue;
    const key = isoWeekKey(w.scheduled_date);
    map.set(key, (map.get(key) ?? 0) + (w.estimated_load ?? 0));
  }
  return map;
}

export function countHardInWeek(
  workouts: WorkoutSnapshot[],
  weekStart: string,
): number {
  return workouts.filter(
    (w) => w.status !== "REPLACED" && isoWeekKey(w.scheduled_date) === weekStart && isHard(w.workout_type),
  ).length;
}

/**
 * Apply a proposed change to the workout list (in-memory) so rules can be
 * evaluated against the *resulting* week, not the current one.
 */
function applyProposal(
  workouts: WorkoutSnapshot[],
  proposal: ChangeProposal,
): WorkoutSnapshot[] {
  if (proposal.workoutId) {
    return workouts.map((w) =>
      w.id === proposal.workoutId
        ? {
            ...w,
            scheduled_date: proposal.scheduled_date,
            workout_type: proposal.workout_type,
            estimated_load: proposal.estimated_load,
          }
        : w,
    );
  }
  return [
    ...workouts,
    {
      id: "__proposed__",
      scheduled_date: proposal.scheduled_date,
      workout_type: proposal.workout_type,
      estimated_load: proposal.estimated_load,
      status: "PLANNED",
    },
  ];
}

/**
 * Central rule engine. Evaluates the *proposed* state and returns warnings.
 *
 * Rules:
 *  - BLOCKING: two hard workouts on consecutive days
 *  - WARNING:  > 2 hard workouts in the affected week
 *  - WARNING:  weekly load jumps by more than 15% vs previous week
 *  - WARNING:  recent moderate/severe pain
 *  - WARNING:  recent high fatigue and proposed workout is hard
 *  - INFO:     non-hard proposed change near other hard sessions (informational)
 */
export function evaluateProposal(
  workouts: WorkoutSnapshot[],
  proposal: ChangeProposal,
  lastLog?: LastLog | null,
): RuleWarning[] {
  const warnings: RuleWarning[] = [];
  const after = applyProposal(workouts, proposal);
  const propId = proposal.workoutId ?? "__proposed__";

  // 1) consecutive hard workouts (BLOCKING) — only flag if the proposal is
  //    itself hard, so easy reschedules never block.
  if (isHard(proposal.workout_type)) {
    const sameOrNeighbour = after.filter(
      (w) =>
        w.id !== propId &&
        w.status !== "REPLACED" &&
        w.status !== "MISSED" &&
        isHard(w.workout_type) &&
        daysBetween(w.scheduled_date, proposal.scheduled_date) <= 1,
    );
    for (const w of sameOrNeighbour) {
      warnings.push({
        severity: "BLOCKING",
        code: "HARD_BACK_TO_BACK",
        message: `Two hard workouts within 24h (${w.scheduled_date} & ${proposal.scheduled_date}). Keep at least 48h between hard sessions.`,
      });
    }
  }

  // 2) > 2 hard workouts in the week (WARNING)
  const weekStart = isoWeekKey(proposal.scheduled_date);
  const hardThisWeek = countHardInWeek(after, weekStart);
  if (hardThisWeek > 2) {
    warnings.push({
      severity: "WARNING",
      code: "TOO_MANY_HARD_WEEK",
      message: `${hardThisWeek} hard workouts in this week. Two is usually plenty for a 10K block.`,
    });
  }

  // 3) +15% weekly load vs previous week (WARNING)
  const loads = weeklyLoadsByWeekStart(after);
  const cur = loads.get(weekStart) ?? 0;
  const prevWeekDate = new Date(weekStart + "T00:00:00");
  prevWeekDate.setDate(prevWeekDate.getDate() - 7);
  const prevKey = prevWeekDate.toISOString().slice(0, 10);
  const prev = loads.get(prevKey) ?? 0;
  if (prev > 0 && cur > prev * 1.15) {
    const pct = Math.round(((cur - prev) / prev) * 100);
    warnings.push({
      severity: "WARNING",
      code: "LOAD_JUMP_15",
      message: `Weekly load increases by ${pct}% versus the previous week. Above the safe 15% rule.`,
    });
  }

  // 4) recent pain (WARNING)
  if (lastLog && (lastLog.pain_level === "MODERATE" || lastLog.pain_level === "SEVERE")) {
    warnings.push({
      severity: "WARNING",
      code: "RECENT_PAIN",
      message: `You reported ${lastLog.pain_level.toLowerCase()} pain on the last workout. Pain changes the plan — consider rest or an easy alternative.`,
    });
  }

  // 5) high fatigue + hard proposal (WARNING)
  if (lastLog?.fatigue_level === "HIGH" && isHard(proposal.workout_type)) {
    warnings.push({
      severity: "WARNING",
      code: "FATIGUE_BEFORE_HARD",
      message: "High fatigue reported recently and this session is hard. An easy run or rest may serve you better.",
    });
  }

  return warnings;
}

/** Convenience: filter blocking warnings */
export function hasBlocking(warnings: RuleWarning[]): boolean {
  return warnings.some((w) => w.severity === "BLOCKING");
}

/** Evaluate the entire plan (no proposal) — used for dashboard banners. */
export function evaluatePlan(
  workouts: WorkoutSnapshot[],
  lastLog?: LastLog | null,
): RuleWarning[] {
  const warnings: RuleWarning[] = [];
  const sorted = [...workouts]
    .filter((w) => w.status !== "REPLACED")
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  // back-to-back hard
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (isHard(a.workout_type) && isHard(b.workout_type) && daysBetween(a.scheduled_date, b.scheduled_date) <= 1) {
      warnings.push({
        severity: "WARNING",
        code: "HARD_BACK_TO_BACK",
        message: `Hard sessions on ${a.scheduled_date} and ${b.scheduled_date} are less than 48h apart.`,
      });
    }
  }

  // load jumps
  const loads = weeklyLoadsByWeekStart(sorted);
  const keys = [...loads.keys()].sort();
  for (let i = 1; i < keys.length; i++) {
    const prev = loads.get(keys[i - 1]) ?? 0;
    const cur = loads.get(keys[i]) ?? 0;
    if (prev > 0 && cur > prev * 1.15) {
      const pct = Math.round(((cur - prev) / prev) * 100);
      warnings.push({
        severity: "WARNING",
        code: "LOAD_JUMP_15",
        message: `Week of ${keys[i]} jumps load by ${pct}% — above the safe 15% rule.`,
      });
    }
  }

  // pain + fatigue context
  if (lastLog?.pain_level === "MODERATE" || lastLog?.pain_level === "SEVERE") {
    warnings.push({
      severity: "WARNING",
      code: "RECENT_PAIN",
      message: `Recent ${lastLog!.pain_level!.toLowerCase()} pain — consider recalibrating the week.`,
    });
  }

  // dedupe by code+message (same back-to-back can flag twice)
  const seen = new Set<string>();
  return warnings.filter((w) => {
    const k = w.code + "|" + w.message;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

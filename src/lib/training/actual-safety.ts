// Safety checks that consume actual (uploaded) activity data, complementing
// the planning-time rules in rules.ts.
import type { RuleWarning } from "./rules";
import { HARD_TYPES, type WorkoutType } from "./types";

export interface ActualActivity {
  id: string;
  start_time: string;
  duration_seconds: number;
  distance_meters: number;
  matched_workout_type?: WorkoutType | null;
  rpe?: number | null;
  pain_level?: "NONE" | "MILD" | "MODERATE" | "SEVERE" | null;
}

function weekStart(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

/**
 * Compares actual weekly load (sum of duration_minutes × RPE, fallback duration)
 * for the most recent two weeks and warns if jump > 15%.
 */
export function checkActualLoadJump(activities: ActualActivity[]): RuleWarning[] {
  const byWeek = new Map<string, number>();
  for (const a of activities) {
    const wk = weekStart(a.start_time);
    const minutes = a.duration_seconds / 60;
    const load = minutes * (a.rpe ?? 4);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + load);
  }
  const sorted = Array.from(byWeek.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  if (sorted.length < 2) return [];
  const [, curr] = sorted[0];
  const [, prev] = sorted[1];
  if (prev > 0 && curr > prev * 1.15) {
    return [{
      severity: "WARNING",
      code: "ACTUAL_LOAD_JUMP",
      message: `Actual load is ${Math.round(((curr - prev) / prev) * 100)}% higher than last week. Consider an easier day.`,
    }];
  }
  return [];
}

/** Moderate/severe pain on a recent activity → recommend downgrading next hard workout. */
export function checkPainAfterActivity(activities: ActualActivity[]): RuleWarning[] {
  const recent = activities.find((a) => a.pain_level === "MODERATE" || a.pain_level === "SEVERE");
  if (!recent) return [];
  return [{
    severity: "WARNING",
    code: "PAIN_REPORTED",
    message: `${recent.pain_level} pain reported. Consider downgrading the next hard workout.`,
  }];
}

/** Easy run with unexpectedly high RPE (≥8) → warn. */
export function checkEasyTooHard(activities: ActualActivity[]): RuleWarning[] {
  const out: RuleWarning[] = [];
  for (const a of activities) {
    if ((a.matched_workout_type === "EASY" || a.matched_workout_type === "RECOVERY") && (a.rpe ?? 0) >= 8) {
      out.push({
        severity: "WARNING",
        code: "EASY_TOO_HARD",
        message: `Easy run on ${a.start_time.slice(0, 10)} had RPE ${a.rpe}. Aim for RPE 3–5 next time.`,
      });
      break;
    }
  }
  return out;
}

/** Two hard actual sessions within <48h → warn. */
export function checkActualHardSpacing(activities: ActualActivity[]): RuleWarning[] {
  const hard = activities
    .filter((a) => a.matched_workout_type && HARD_TYPES.includes(a.matched_workout_type))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  for (let i = 1; i < hard.length; i++) {
    const diffH = (new Date(hard[i].start_time).getTime() - new Date(hard[i - 1].start_time).getTime()) / 3.6e6;
    if (diffH < 48) {
      return [{
        severity: "WARNING",
        code: "ACTUAL_HARD_SPACING",
        message: `Two hard sessions less than 48h apart on ${hard[i - 1].start_time.slice(0, 10)} & ${hard[i].start_time.slice(0, 10)}.`,
      }];
    }
  }
  return [];
}

export function evaluateActuals(activities: ActualActivity[]): RuleWarning[] {
  return [
    ...checkActualLoadJump(activities),
    ...checkPainAfterActivity(activities),
    ...checkEasyTooHard(activities),
    ...checkActualHardSpacing(activities),
  ];
}

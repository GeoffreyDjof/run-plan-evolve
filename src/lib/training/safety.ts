import type { WorkoutType } from "./types";
import { HARD_TYPES } from "./types";

export interface WorkoutLite {
  id: string;
  scheduled_date: string;
  workout_type: WorkoutType;
  estimated_load: number | null;
  status: string;
}

export interface Warning {
  severity: "info" | "warn" | "danger";
  message: string;
}

export function isHard(t: WorkoutType): boolean {
  return HARD_TYPES.includes(t);
}

export function weeklyLoads(workouts: WorkoutLite[]): Record<number, number> {
  // by ISO week-start (Mon)
  const map: Record<string, number> = {};
  for (const w of workouts) {
    const d = new Date(w.scheduled_date);
    const mon = new Date(d);
    const day = d.getDay();
    mon.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    const key = mon.toISOString().slice(0, 10);
    map[key] = (map[key] ?? 0) + (w.estimated_load ?? 0);
  }
  // map to indexed
  const keys = Object.keys(map).sort();
  const out: Record<number, number> = {};
  keys.forEach((k, i) => (out[i] = map[k]));
  return out;
}

export function checkBackToBackHard(workouts: WorkoutLite[]): Warning[] {
  const sorted = [...workouts].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  const warns: Warning[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (isHard(a.workout_type) && isHard(b.workout_type)) {
      const d1 = new Date(a.scheduled_date);
      const d2 = new Date(b.scheduled_date);
      const diff = (d2.getTime() - d1.getTime()) / 86400000;
      if (diff <= 1) {
        warns.push({
          severity: "warn",
          message: `Two hard workouts on consecutive days (${a.scheduled_date} & ${b.scheduled_date}). Consider spacing them.`,
        });
      }
    }
  }
  return warns;
}

export function checkLoadJump(workouts: WorkoutLite[]): Warning[] {
  const loads = weeklyLoads(workouts);
  const warns: Warning[] = [];
  const idx = Object.keys(loads).map(Number).sort((a, b) => a - b);
  for (let i = 1; i < idx.length; i++) {
    const prev = loads[idx[i - 1]];
    const cur = loads[idx[i]];
    if (prev > 0 && cur > prev * 1.15) {
      warns.push({
        severity: "warn",
        message: `Weekly load jumps +${Math.round(((cur - prev) / prev) * 100)}% (above the safe 15% rule).`,
      });
    }
  }
  return warns;
}

export function checkFatigueBeforeHard(
  nextWorkout: WorkoutLite | undefined,
  lastFatigue: "LOW" | "NORMAL" | "HIGH" | null,
  lastPain: "NONE" | "MILD" | "MODERATE" | "SEVERE" | null,
): Warning[] {
  const warns: Warning[] = [];
  if (lastPain === "MODERATE" || lastPain === "SEVERE") {
    warns.push({ severity: "danger", message: `Recent ${lastPain.toLowerCase()} pain reported. Consider rest or seek advice.` });
  }
  if (lastFatigue === "HIGH" && nextWorkout && isHard(nextWorkout.workout_type)) {
    warns.push({
      severity: "warn",
      message: `High fatigue reported and next session (${nextWorkout.workout_type}) is hard. Consider an easier alternative.`,
    });
  }
  return warns;
}

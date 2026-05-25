import type { WorkoutType } from "./types";
import { isHard } from "./rules";

export interface RecalInput {
  id: string;
  scheduled_date: string;
  workout_type: WorkoutType;
  title: string;
  estimated_duration_minutes: number | null;
  estimated_load: number | null;
  status: string;
}

export interface RecalAction {
  workoutId: string;
  action: "KEEP" | "DOWNGRADE_TO_EASY" | "REMOVE";
  new_type?: WorkoutType;
  new_title?: string;
  new_main_set?: string;
  new_duration?: number;
  new_load?: number;
  reason: string;
}

export interface RecalProposal {
  triggers: string[];
  actions: RecalAction[];
  summary: string;
}

export interface RecalContext {
  workouts: RecalInput[];
  weekStart: string; // monday ISO
  missedThisWeek: number;
  highFatigueStreak: number; // count of consecutive HIGH fatigue logs
  hasPainFlag: boolean;
  manualTrigger?: boolean;
}

export function shouldRecalibrate(ctx: RecalContext): string[] {
  const t: string[] = [];
  if (ctx.missedThisWeek >= 2) t.push(`${ctx.missedThisWeek} missed workouts this week.`);
  if (ctx.highFatigueStreak >= 2) t.push("High fatigue reported twice in a row.");
  if (ctx.hasPainFlag) t.push("Moderate or severe pain reported recently.");
  if (ctx.manualTrigger) t.push("Manual recalibration requested.");
  return t;
}

/**
 * Build a recalibrated week.
 *
 * Strategy:
 *  - keep the next future "key" hard session (first hard that hasn't passed) IF
 *    pain is not flagged.
 *  - downgrade other hard sessions to easy runs of similar duration.
 *  - drop any session less than 48h after a kept hard session.
 *  - if pain is flagged, downgrade ALL hard sessions.
 */
export function recalibrateWeek(ctx: RecalContext): RecalProposal {
  const triggers = shouldRecalibrate(ctx);
  const today = new Date().toISOString().slice(0, 10);
  const future = ctx.workouts
    .filter((w) => w.scheduled_date >= today && (w.status === "PLANNED" || w.status === "RESCHEDULED"))
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  const keyHard = ctx.hasPainFlag ? null : future.find((w) => isHard(w.workout_type)) ?? null;
  const actions: RecalAction[] = [];

  for (const w of future) {
    if (keyHard && w.id === keyHard.id) {
      actions.push({
        workoutId: w.id,
        action: "KEEP",
        reason: "Kept as the key workout — preserves the main stimulus of the week.",
      });
      continue;
    }

    // Drop sessions within 48h of the kept key hard
    if (keyHard && hoursBetween(w.scheduled_date, keyHard.scheduled_date) < 48 && isHard(w.workout_type)) {
      actions.push({
        workoutId: w.id,
        action: "REMOVE",
        reason: "Too close to the kept key session — drop to keep at least 48h between hard work.",
      });
      continue;
    }

    if (isHard(w.workout_type)) {
      const dur = Math.min(45, Math.max(30, w.estimated_duration_minutes ?? 40));
      actions.push({
        workoutId: w.id,
        action: "DOWNGRADE_TO_EASY",
        new_type: "EASY",
        new_title: `${dur} min easy run`,
        new_main_set: `${dur} min continuous easy. Conversational pace — easy means easy.`,
        new_duration: dur,
        new_load: dur * 3,
        reason: ctx.hasPainFlag
          ? "Pain reported — downgrade to easy to protect recovery."
          : "Recalibrating week — replace hard stimulus with easy aerobic run.",
      });
      continue;
    }

    // Easy / long / recovery — keep but trim long runs if fatigue trigger
    if (w.workout_type === "LONG_RUN" && ctx.highFatigueStreak >= 2) {
      const dur = Math.min(50, Math.max(35, (w.estimated_duration_minutes ?? 60) - 20));
      actions.push({
        workoutId: w.id,
        action: "DOWNGRADE_TO_EASY",
        new_type: "EASY",
        new_title: `${dur} min easy run (trimmed long run)`,
        new_main_set: `${dur} min easy continuous`,
        new_duration: dur,
        new_load: dur * 3,
        reason: "High fatigue streak — trim long run to a moderate easy run.",
      });
      continue;
    }

    actions.push({
      workoutId: w.id,
      action: "KEEP",
      reason: "Easy / recovery session — kept as-is.",
    });
  }

  const summary = ctx.hasPainFlag
    ? "Pain-aware recalibration: all hard work is downgraded to easy running this week."
    : keyHard
      ? `Kept the key ${keyHard.workout_type} session, downgraded other hard work to easy running.`
      : "No upcoming hard sessions to preserve — kept easy sessions and trimmed long runs if needed.";

  return { triggers, actions, summary };
}

function hoursBetween(a: string, b: string): number {
  return Math.abs(
    (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 3600000,
  );
}

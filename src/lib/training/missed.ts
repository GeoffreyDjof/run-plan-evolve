import type { WorkoutType } from "./types";
import { isHard } from "./rules";

export type MissedDecision =
  | { action: "SKIP"; reason: string }
  | { action: "SUGGEST_REPLACE_NEXT_HARD"; reason: string; targetId: string }
  | { action: "RESCHEDULE_OK"; reason: string };

export interface MissedContext {
  missedType: WorkoutType;
  missedDate: string;
  /** Future planned workouts after the missed date, sorted asc. */
  upcoming: Array<{ id: string; scheduled_date: string; workout_type: WorkoutType }>;
}

function hoursBetween(a: string, b: string): number {
  return Math.abs(
    (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 3600000,
  );
}

/**
 * Decide what to do with a missed workout.
 *
 * Policy:
 *  - easy / recovery / long-run miss → skip silently, do not chase.
 *  - hard miss + next hard within 48h → skip the missed one (don't pile up).
 *  - 10K-pace miss → offer to upgrade the next hard session (only if safe).
 *  - otherwise → reschedule is allowed, but never auto-move all future sessions.
 */
export function decideMissed(ctx: MissedContext): MissedDecision {
  if (!isHard(ctx.missedType)) {
    return {
      action: "SKIP",
      reason: "Easy / long-run sessions are not worth chasing — skip and resume the plan.",
    };
  }

  const nextHard = ctx.upcoming.find((w) => isHard(w.workout_type));
  if (nextHard && hoursBetween(ctx.missedDate, nextHard.scheduled_date) < 48) {
    return {
      action: "SKIP",
      reason: `Next hard session (${nextHard.workout_type}) is within 48h. Do not stack — skip the missed one.`,
    };
  }

  if (ctx.missedType === "TEN_K_PACE" && nextHard) {
    return {
      action: "SUGGEST_REPLACE_NEXT_HARD",
      targetId: nextHard.id,
      reason: "Race-pace stimulus matters — consider replacing the next hard session with a 10K-pace one, if your legs are fresh.",
    };
  }

  return {
    action: "RESCHEDULE_OK",
    reason: "You can reschedule this session, but keep at least 48h from any other hard workout.",
  };
}

/**
 * Lightweight validation suite for the training engine.
 *
 * Not wired to a test runner — invoke `runValidations()` from a server fn or
 * a one-off script to verify the core rules behave as documented.
 *
 * Each `expect` function throws if the assertion fails; `runValidations`
 * collects results and returns a summary.
 */
import { paceFromVMA, kmhToPace, plannedRPE } from "./paces";
import { isHard, evaluateProposal, weeklyLoadsByWeekStart } from "./rules";
import { EQUIVALENTS } from "./alternatives";
import { decideMissed } from "./missed";
import { recalibrateWeek } from "./recalibration";
import type { WorkoutSnapshot } from "./rules";

interface Result {
  name: string;
  ok: boolean;
  error?: string;
}

function expect(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function run(name: string, fn: () => void, results: Result[]) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, error: (e as Error).message });
  }
}

export function runValidations(): { results: Result[]; passed: number; failed: number } {
  const r: Result[] = [];

  run("paceFromVMA: 14 km/h @ 100% = 4:17/km", () => {
    const p = paceFromVMA(14, 100);
    expect(p.paceStr === "4:17", `got ${p.paceStr}`);
  }, r);

  run("paceFromVMA: 14 km/h @ 70% returns slower than @ 90%", () => {
    const slow = paceFromVMA(14, 70).kmh;
    const fast = paceFromVMA(14, 90).kmh;
    expect(fast > slow, "fast must be > slow");
  }, r);

  run("kmhToPace handles zero", () => {
    expect(kmhToPace(0) === "—", "expected dash");
  }, r);

  run("isHard detects HARD types", () => {
    expect(isHard("VMA_SHORT"), "VMA_SHORT");
    expect(isHard("THRESHOLD"), "THRESHOLD");
    expect(isHard("TEN_K_PACE"), "TEN_K_PACE");
    expect(isHard("HILLS"), "HILLS");
    expect(!isHard("EASY"), "EASY should be soft");
    expect(!isHard("LONG_RUN"), "LONG_RUN should be soft");
    expect(!isHard("RECOVERY"), "RECOVERY should be soft");
  }, r);

  run("weekly load calculation sums per ISO week", () => {
    const ws: WorkoutSnapshot[] = [
      { id: "1", scheduled_date: "2026-05-25", workout_type: "VMA_LONG", estimated_load: 100, status: "PLANNED" }, // Mon
      { id: "2", scheduled_date: "2026-05-28", workout_type: "EASY", estimated_load: 50, status: "PLANNED" },     // Thu
      { id: "3", scheduled_date: "2026-06-01", workout_type: "VMA_LONG", estimated_load: 120, status: "PLANNED" }, // next Mon
    ];
    const loads = weeklyLoadsByWeekStart(ws);
    expect(loads.get("2026-05-25") === 150, `expected 150, got ${loads.get("2026-05-25")}`);
    expect(loads.get("2026-06-01") === 120, `expected 120, got ${loads.get("2026-06-01")}`);
  }, r);

  run("evaluateProposal: BLOCKING on hard sessions within 24h", () => {
    const ws: WorkoutSnapshot[] = [
      { id: "1", scheduled_date: "2026-05-26", workout_type: "VMA_LONG", estimated_load: 100, status: "PLANNED" },
    ];
    const warns = evaluateProposal(ws, {
      workoutId: null,
      scheduled_date: "2026-05-27",
      workout_type: "THRESHOLD",
      estimated_load: 100,
    });
    expect(warns.some((w) => w.severity === "BLOCKING" && w.code === "HARD_BACK_TO_BACK"), "expected blocking conflict");
  }, r);

  run("evaluateProposal: easy reschedule near hard does not block", () => {
    const ws: WorkoutSnapshot[] = [
      { id: "1", scheduled_date: "2026-05-26", workout_type: "VMA_LONG", estimated_load: 100, status: "PLANNED" },
    ];
    const warns = evaluateProposal(ws, {
      workoutId: null,
      scheduled_date: "2026-05-27",
      workout_type: "EASY",
      estimated_load: 30,
    });
    expect(!warns.some((w) => w.severity === "BLOCKING"), "easy near hard should not block");
  }, r);

  run("alternatives library: same family by type", () => {
    for (const [type, alts] of Object.entries(EQUIVALENTS)) {
      if (type === "RACE") continue;
      expect(alts.length > 0, `no alternatives for ${type}`);
      // alternatives must remain in the same training family (or an accepted
      // cross-family swap like HILLS for VMA_SHORT)
      const validFamilies: Record<string, string[]> = {
        VMA_SHORT: ["VMA_SHORT", "HILLS"],
        VMA_LONG: ["VMA_LONG"],
        THRESHOLD: ["THRESHOLD"],
        TEN_K_PACE: ["TEN_K_PACE"],
        EASY: ["EASY", "RECOVERY"],
        LONG_RUN: ["LONG_RUN", "EASY"],
        HILLS: ["HILLS", "VMA_SHORT"],
        RECOVERY: ["RECOVERY", "EASY"],
        TAPER: ["TAPER"],
        TEST: ["TEST"],
      };
      const allowed = validFamilies[type] ?? [type];
      for (const a of alts) {
        expect(allowed.includes(a.type), `${type} alt ${a.title} has wrong family ${a.type}`);
      }
    }
  }, r);

  run("missed: easy miss → skip", () => {
    const d = decideMissed({ missedType: "EASY", missedDate: "2026-05-25", upcoming: [] });
    expect(d.action === "SKIP", `expected SKIP, got ${d.action}`);
  }, r);

  run("missed: hard miss with next hard < 48h → skip", () => {
    const d = decideMissed({
      missedType: "THRESHOLD",
      missedDate: "2026-05-25",
      upcoming: [{ id: "x", scheduled_date: "2026-05-26", workout_type: "VMA_LONG" }],
    });
    expect(d.action === "SKIP", `expected SKIP, got ${d.action}`);
  }, r);

  run("missed: 10K-pace miss → suggest replace next hard", () => {
    const d = decideMissed({
      missedType: "TEN_K_PACE",
      missedDate: "2026-05-25",
      upcoming: [{ id: "n", scheduled_date: "2026-05-30", workout_type: "VMA_LONG" }],
    });
    expect(d.action === "SUGGEST_REPLACE_NEXT_HARD", `expected SUGGEST, got ${d.action}`);
  }, r);

  run("recalibration: pain flag downgrades all hard", () => {
    const prop = recalibrateWeek({
      workouts: [
        { id: "a", scheduled_date: "2099-01-01", workout_type: "VMA_LONG", title: "x", estimated_duration_minutes: 60, estimated_load: 480, status: "PLANNED" },
        { id: "b", scheduled_date: "2099-01-03", workout_type: "THRESHOLD", title: "y", estimated_duration_minutes: 60, estimated_load: 420, status: "PLANNED" },
      ],
      weekStart: "2099-01-01",
      missedThisWeek: 0,
      highFatigueStreak: 0,
      hasPainFlag: true,
    });
    expect(prop.actions.every((a) => a.action !== "KEEP"), "all hard should be downgraded/removed when pain flag");
  }, r);

  run("plannedRPE: hard > easy", () => {
    expect(plannedRPE("VMA_SHORT") > plannedRPE("EASY"), "VMA_SHORT should be harder than EASY");
  }, r);

  const passed = r.filter((x) => x.ok).length;
  const failed = r.length - passed;
  return { results: r, passed, failed };
}

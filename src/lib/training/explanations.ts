import type { WorkoutType } from "./types";

export interface WorkoutExplanation {
  goal: string;
  fit: string;
  sensation: string;
  reduceWhen: string;
  safeAlternative: string;
}

const EXPLANATIONS: Record<WorkoutType, WorkoutExplanation> = {
  VMA_SHORT: {
    goal: "Improve speed reserve and VO₂max via short, high-quality reps near or above VMA.",
    fit: "Sharpens top-end engine without huge fatigue cost — fits any week that already has a longer aerobic stimulus.",
    sensation: "Fast but controlled. Form should stay clean, breathing strong but recoverable inside the rest.",
    reduceWhen: "Stop or reduce if mechanics degrade or calf / Achilles pain appears. Easy means easy on rest.",
    safeAlternative: "Drop to 30/30s at 100% VMA, or replace with an easy run if fatigue or pain is present.",
  },
  VMA_LONG: {
    goal: "Sustain time near VMA to lift aerobic ceiling and durability at high intensity.",
    fit: "Bread-and-butter of a 10K block — improves the ceiling the race effort sits under.",
    sensation: "Hard but rhythmic. Last rep should feel like the first — not a sprint.",
    reduceWhen: "Cut reps if you can't hold pace on the final third, or if HR drifts > 5 bpm above target.",
    safeAlternative: "Shorten reps (5×3 instead of 5×5) or move to a threshold session if legs are heavy.",
  },
  THRESHOLD: {
    goal: "Improve sustainable aerobic power — push the pace you can hold for ~1 hour.",
    fit: "Direct support to 10K specificity. Most weeks should include one threshold-family session.",
    sensation: "Controlled-hard. Conversation in 2-3 word bursts. Not all-out.",
    reduceWhen: "Drop to continuous tempo if reps drift slower across the set.",
    safeAlternative: "Replace with 25 min continuous tempo or a steady long run finish.",
  },
  TEN_K_PACE: {
    goal: "Specificity — teach rhythm, pacing, and fatigue resistance at exact race effort.",
    fit: "Race rehearsal. Most useful in weeks 5–11.",
    sensation: "Race effort. Hard but sustainable. Focus on cadence and posture.",
    reduceWhen: "If first rep already feels like a 5K, drop pace by 5–10 sec/km — pace beats heroics.",
    safeAlternative: "Cut reps in half, or substitute a threshold block if you can't hold target pace.",
  },
  HILLS: {
    goal: "Power and form economy with lower impact than flat VMA work.",
    fit: "Great early-block alternative to VMA short, or anytime you want neuromuscular work without flat speed.",
    sensation: "Strong, driving uphill. Walk or jog down to recover fully.",
    reduceWhen: "Stop if cadence drops or knee/Achilles complain.",
    safeAlternative: "Swap to 30/30s on a flat road if hills aren't available.",
  },
  EASY: {
    goal: "Aerobic base, recovery between hard sessions, fat oxidation.",
    fit: "The glue of the plan. Most weekly volume should sit here.",
    sensation: "Conversational. Nose-breathing possible. Easy means easy.",
    reduceWhen: "If pace creeps up unintentionally, slow down. Easy stays easy.",
    safeAlternative: "Z2 bike or 30 min brisk walk if running feels heavy.",
  },
  LONG_RUN: {
    goal: "Build durability — keep moving aerobically for longer than race duration.",
    fit: "Weekly anchor for endurance. Length grows gradually, never +20% week-on-week.",
    sensation: "Easy to steady. Strong but not strained on the last 20 min.",
    reduceWhen: "Cut length if last week's load was already high or fatigue is high.",
    safeAlternative: "Shorter easy long run; skip the steady finish if legs are tired.",
  },
  RECOVERY: {
    goal: "Active recovery — promote blood flow without adding load.",
    fit: "Drops in between hard days when needed.",
    sensation: "Very easy. You should finish feeling fresher than you started.",
    reduceWhen: "Replace with full rest if any pain.",
    safeAlternative: "Walk, mobility, or rest day.",
  },
  TAPER: {
    goal: "Lower fatigue while keeping sharpness before race day.",
    fit: "Final week. Volume drops, intensity stays brief.",
    sensation: "Easy with snappy strides. Legs should feel springy.",
    reduceWhen: "Skip strides if any pain — taper is for recovering, not proving.",
    safeAlternative: "Short easy jog without strides.",
  },
  TEST: {
    goal: "Estimate current VMA to recalibrate pace zones.",
    fit: "Use sparingly — at block start or after a recovery week.",
    sensation: "Maximal sustainable effort for the duration. Stay smooth, not ragged.",
    reduceWhen: "Abandon test if pain appears — data isn't worth an injury.",
    safeAlternative: "Use last race result + Mercier formula instead.",
  },
  RACE: {
    goal: "Execute the 10K. Trust the block.",
    fit: "End of plan.",
    sensation: "Controlled first half, brave second half.",
    reduceWhen: "Pull back if dizzy, chest pain, or sudden cramp.",
    safeAlternative: "Pace yourself by feel if GPS fails — relative effort over numbers.",
  },
};

export function explainWorkout(t: WorkoutType): WorkoutExplanation {
  return EXPLANATIONS[t];
}

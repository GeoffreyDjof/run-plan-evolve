import type { WorkoutType, WorkoutDraft } from "./types";
import { plannedRPE } from "./paces";

export interface GenerateInput {
  type: WorkoutType;
  availableTime: number; // minutes
  difficulty: "EASIER" | "NORMAL" | "HARDER";
  terrain: "ROAD" | "TRACK" | "TREADMILL" | "HILLY";
  monotony: "CLASSIC" | "VARIED" | "PLAYFUL";
  weekNumber: number;
}

export interface GeneratedWorkout extends WorkoutDraft {
  estimated_load: number;
  reasoning: string[];
}

const WU = "15 min easy + 4 strides";
const WU_SHORT = "10 min easy + 3 strides";
const CD = "10 min easy + mobility";

function diffMultiplier(d: GenerateInput["difficulty"]): number {
  return d === "EASIER" ? 0.85 : d === "HARDER" ? 1.15 : 1.0;
}

export function generateWorkout(input: GenerateInput): GeneratedWorkout {
  const reasoning: string[] = [];
  const m = diffMultiplier(input.difficulty);
  reasoning.push(`Same physiological stimulus: ${input.type}`);
  reasoning.push(`Difficulty: ${input.difficulty.toLowerCase()} (×${m.toFixed(2)})`);
  reasoning.push(`Fits available time: ${input.availableTime} min`);
  reasoning.push(`Compatible with week ${input.weekNumber}`);

  let draft: WorkoutDraft;

  switch (input.type) {
    case "VMA_SHORT": {
      const work = Math.max(6, Math.min(20, Math.round((input.availableTime - 25) / 2)));
      draft = mkDraft(input, "VMA Short – generated", {
        warmup: WU,
        main_set: input.monotony === "PLAYFUL"
          ? `${work} × 30s on / 30s off @ 102% VMA (alternating short hills + flat)`
          : `${work} × 30s @ ${Math.round(102 * m)}% VMA, 30s jog`,
        recovery: "30s easy between",
        cooldown: CD,
        vma_min: 100 * m, vma_max: 105 * m,
        duration: input.availableTime,
        difficulty: input.difficulty === "HARDER" ? 5 : 4,
      });
      if (input.terrain === "HILLY") reasoning.push("Terrain note: use rolling reps to keep impact varied");
      break;
    }
    case "VMA_LONG": {
      const repMin = input.monotony === "VARIED" ? 4 : 3;
      const reps = Math.max(3, Math.min(7, Math.floor((input.availableTime - 25) / (repMin + 2))));
      draft = mkDraft(input, "VMA Long – generated", {
        warmup: WU,
        main_set: `${reps} × ${repMin} min @ ${Math.round(94 * m)}% VMA`,
        recovery: `${repMin === 3 ? 2 : 2.5} min jog between reps`,
        cooldown: CD,
        vma_min: 92 * m, vma_max: 95 * m,
        duration: input.availableTime,
        difficulty: 4,
      });
      break;
    }
    case "THRESHOLD": {
      const blockMin = input.monotony === "VARIED" ? 10 : 12;
      const blocks = Math.max(2, Math.min(3, Math.floor((input.availableTime - 25) / (blockMin + 2))));
      draft = mkDraft(input, "Threshold – generated", {
        warmup: WU,
        main_set: `${blocks} × ${blockMin} min @ ${Math.round(85 * m)}% VMA`,
        recovery: "2–3 min jog between",
        cooldown: CD,
        vma_min: 82 * m, vma_max: 88 * m,
        duration: input.availableTime,
        difficulty: 4,
      });
      break;
    }
    case "TEN_K_PACE": {
      const km = Math.max(3, Math.min(6, Math.floor((input.availableTime - 25) / 6)));
      draft = mkDraft(input, "10K Pace – generated", {
        warmup: WU,
        main_set: `${km} × 1 km @ 10K pace`,
        recovery: "90s jog between",
        cooldown: CD,
        vma_min: 88, vma_max: 91,
        duration: input.availableTime,
        difficulty: 4,
      });
      break;
    }
    case "HILLS": {
      const reps = Math.max(6, Math.min(12, Math.floor((input.availableTime - 25) / 3)));
      draft = mkDraft(input, "Hills – generated", {
        warmup: WU_SHORT,
        main_set: `${reps} × 45s strong uphill, walk down recovery`,
        recovery: "walk down",
        cooldown: CD,
        vma_min: 100, vma_max: 110,
        duration: input.availableTime,
        difficulty: 4,
      });
      break;
    }
    case "EASY":
    case "RECOVERY":
      draft = mkDraft(input, input.type === "RECOVERY" ? "Recovery Jog" : "Easy Run", {
        warmup: "Smooth easy start",
        main_set: `${input.availableTime} min easy continuous`,
        recovery: "—",
        cooldown: "Stretch",
        vma_min: 65, vma_max: 75,
        duration: input.availableTime,
        difficulty: 2,
      });
      break;
    case "LONG_RUN":
      draft = mkDraft(input, "Long Run – generated", {
        warmup: "Smooth start",
        main_set: input.monotony === "VARIED"
          ? `${input.availableTime - 15} min easy + 15 min steady @ 78% VMA`
          : `${input.availableTime} min easy continuous`,
        recovery: "—",
        cooldown: "Walk + stretch",
        vma_min: 65, vma_max: input.monotony === "VARIED" ? 80 : 75,
        duration: input.availableTime,
        difficulty: 3,
      });
      break;
    case "TAPER":
      draft = mkDraft(input, "Taper – Easy + Strides", {
        warmup: "Smooth easy",
        main_set: `${Math.max(20, input.availableTime - 5)} min easy + 4 × 80m strides`,
        recovery: "—",
        cooldown: "Stretch",
        vma_min: 65, vma_max: 75,
        duration: input.availableTime,
        difficulty: 2,
      });
      break;
    case "TEST":
      draft = mkDraft(input, "VMA Test – 6 min Max", {
        warmup: WU,
        main_set: "6 min maximal effort (track preferred)",
        recovery: "—",
        cooldown: CD,
        vma_min: 95, vma_max: 110,
        duration: input.availableTime,
        difficulty: 5,
      });
      break;
    case "RACE":
      draft = mkDraft(input, "Race – 10K", {
        warmup: WU,
        main_set: "10 km race effort",
        recovery: "—",
        cooldown: "Walk + stretch",
        vma_min: 88, vma_max: 92,
        duration: 60,
        difficulty: 5,
      });
      break;
  }

  if (input.terrain === "TREADMILL") reasoning.push("Treadmill OK: use 1% incline");
  if (input.terrain === "TRACK") reasoning.push("Track-friendly: measure reps in laps");
  if (input.monotony === "PLAYFUL") reasoning.push("Playful structure: varied stimuli");

  const load = Math.round(draft.estimated_duration_minutes * plannedRPE(draft.workout_type) * m);
  return { ...draft, estimated_load: load, reasoning };
}

function mkDraft(
  input: GenerateInput,
  title: string,
  s: {
    warmup: string; main_set: string; recovery: string; cooldown: string;
    vma_min: number; vma_max: number; duration: number; difficulty: number;
  },
): WorkoutDraft {
  return {
    week_number: input.weekNumber,
    workout_type: input.type,
    title,
    objective: `Generated ${input.type} workout`,
    warmup: s.warmup,
    main_set: s.main_set,
    recovery: s.recovery,
    cooldown: s.cooldown,
    target_vma_min_percent: Math.round(s.vma_min * 10) / 10,
    target_vma_max_percent: Math.round(s.vma_max * 10) / 10,
    estimated_duration_minutes: s.duration,
    difficulty: s.difficulty,
  };
}

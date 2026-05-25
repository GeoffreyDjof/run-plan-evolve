import type { WorkoutType } from "./types";

/** Convert km/h to pace string "m:ss/km". */
export function kmhToPace(kmh: number): string {
  if (kmh <= 0) return "—";
  const secPerKm = 3600 / kmh;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm - min * 60);
  if (sec === 60) return `${min + 1}:00`;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function paceFromVMA(vmaKmh: number, percentage: number) {
  const kmh = (vmaKmh * percentage) / 100;
  return { kmh: Math.round(kmh * 100) / 100, paceStr: kmhToPace(kmh) };
}

export interface PaceZone {
  label: string;
  min: number; // % VMA
  max: number;
}

export const PACE_ZONES: Record<string, PaceZone> = {
  EASY: { label: "Easy", min: 65, max: 75 },
  STEADY: { label: "Steady", min: 75, max: 80 },
  THRESHOLD: { label: "Threshold", min: 82, max: 88 },
  TEN_K_PACE: { label: "10K Pace", min: 88, max: 91 },
  VMA_LONG: { label: "VMA Long", min: 92, max: 97 },
  VMA_SHORT: { label: "VMA Short", min: 100, max: 105 },
};

export function zoneForType(t: WorkoutType): PaceZone {
  switch (t) {
    case "VMA_SHORT": return PACE_ZONES.VMA_SHORT;
    case "VMA_LONG": return PACE_ZONES.VMA_LONG;
    case "THRESHOLD": return PACE_ZONES.THRESHOLD;
    case "TEN_K_PACE": return PACE_ZONES.TEN_K_PACE;
    case "EASY":
    case "LONG_RUN":
    case "RECOVERY":
    case "TAPER":
      return PACE_ZONES.EASY;
    case "HILLS": return PACE_ZONES.VMA_LONG;
    case "TEST": return PACE_ZONES.VMA_SHORT;
    case "RACE": return PACE_ZONES.TEN_K_PACE;
  }
}

export function paceRangeFromVMA(vmaKmh: number, minPct: number, maxPct: number) {
  return {
    kmhMin: Math.round(vmaKmh * minPct) / 100,
    kmhMax: Math.round(vmaKmh * maxPct) / 100,
    paceMin: kmhToPace((vmaKmh * maxPct) / 100), // faster pace = smaller min:ss
    paceMax: kmhToPace((vmaKmh * minPct) / 100),
  };
}

/** load = minutes * RPE */
export function estimateWorkoutLoad(durationMinutes: number, rpe: number): number {
  return Math.round(durationMinutes * rpe);
}

/** Heuristic RPE per workout type for planning */
export function plannedRPE(t: WorkoutType): number {
  switch (t) {
    case "VMA_SHORT": return 9;
    case "VMA_LONG": return 8;
    case "THRESHOLD": return 7;
    case "TEN_K_PACE": return 8;
    case "HILLS": return 8;
    case "LONG_RUN": return 5;
    case "EASY": return 3;
    case "RECOVERY": return 2;
    case "TAPER": return 4;
    case "TEST": return 9;
    case "RACE": return 10;
  }
}

/** Mercier-style predicted 10K time (minutes) from VMA km/h. */
export function predicted10kMinutes(vmaKmh: number): number {
  // Pace at ~92% VMA is realistic 10K race pace for trained recreational
  const racePaceKmh = vmaKmh * 0.92;
  const minutes = (10 / racePaceKmh) * 60;
  return Math.round(minutes * 10) / 10;
}

export function formatMinutesToTime(m: number): string {
  const min = Math.floor(m);
  const sec = Math.round((m - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

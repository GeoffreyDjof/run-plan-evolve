import type { ParseResult, ParsedActivity, ActivityKind } from "./types";
import { paceSecPerKm, speedKmh } from "./geo";

function splitCsvLine(line: string): string[] {
  return line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
}

function parseDurationToSeconds(s: string): number {
  if (!s) return 0;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const parts = s.split(":").map((x) => parseInt(x, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

const KIND_MAP: Record<string, ActivityKind> = {
  run: "RUN",
  running: "RUN",
  ride: "RIDE",
  bike: "RIDE",
  cycling: "RIDE",
  walk: "WALK",
  walking: "WALK",
  strength: "STRENGTH",
};

export function parseCSV(text: string): ParseResult {
  try {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return { status: "FAILED", fileType: "CSV", error: "CSV needs header + 1 row" };
    }
    const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
    const row = splitCsvLine(lines[1]);
    const get = (key: string) => {
      const i = headers.indexOf(key);
      return i >= 0 ? row[i] : "";
    };

    const dateStr = get("date") || new Date().toISOString();
    const kindRaw = (get("activity_type") || "RUN").toLowerCase();
    const kind: ActivityKind = KIND_MAP[kindRaw] ?? "RUN";
    const distanceKm = parseFloat(get("distance_km") || "0");
    const durationSec = parseDurationToSeconds(get("duration"));
    const avgHr = parseInt(get("average_heart_rate") || "0", 10) || null;
    const maxHr = parseInt(get("max_heart_rate") || "0", 10) || null;
    const elev = parseFloat(get("elevation_gain_meters") || "0") || null;

    if (!distanceKm && !durationSec) {
      return { status: "FAILED", fileType: "CSV", error: "Need distance_km or duration" };
    }

    const distance = distanceKm * 1000;
    const start = new Date(dateStr);
    if (isNaN(start.getTime())) {
      return { status: "FAILED", fileType: "CSV", error: "Invalid date" };
    }

    const activity: ParsedActivity = {
      activity_type: kind,
      start_time: start.toISOString(),
      duration_seconds: durationSec,
      distance_meters: Math.round(distance),
      average_pace_sec_per_km: paceSecPerKm(distance, durationSec),
      average_speed_kmh: speedKmh(distance, durationSec),
      average_heart_rate: avgHr,
      max_heart_rate: maxHr,
      elevation_gain_meters: elev,
      splits: [],
      raw_summary: { source: "csv" },
    };
    return { status: "PARSED", fileType: "CSV", activity };
  } catch (e) {
    return { status: "FAILED", fileType: "CSV", error: (e as Error).message };
  }
}

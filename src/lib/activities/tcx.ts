import type { ParseResult, ParsedActivity, ParsedSplit, ActivityKind } from "./types";
import { paceSecPerKm, speedKmh } from "./geo";

function text(el: Element | null | undefined, tag: string): string | null {
  if (!el) return null;
  const n = el.getElementsByTagName(tag)[0];
  return n?.textContent ?? null;
}
function num(s: string | null | undefined): number | null {
  if (!s) return null;
  const v = parseFloat(s);
  return isNaN(v) ? null : v;
}

const SPORT_MAP: Record<string, ActivityKind> = {
  Running: "RUN",
  Biking: "RIDE",
  Walking: "WALK",
  Other: "OTHER",
};

export function parseTCX(xml: string): ParseResult {
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) {
      return { status: "FAILED", fileType: "TCX", error: "Invalid XML" };
    }
    const activityEl = doc.getElementsByTagName("Activity")[0];
    if (!activityEl) return { status: "FAILED", fileType: "TCX", error: "No <Activity>" };

    const sport = activityEl.getAttribute("Sport") || "Other";
    const kind: ActivityKind = SPORT_MAP[sport] ?? "OTHER";

    const laps = Array.from(activityEl.getElementsByTagName("Lap"));
    if (laps.length === 0) return { status: "FAILED", fileType: "TCX", error: "No laps" };

    let totalDistance = 0;
    let totalDuration = 0;
    let hrSum = 0;
    let hrCount = 0;
    let maxHr = 0;
    let calories = 0;
    const splits: ParsedSplit[] = [];

    let firstTime: Date | null = null;

    for (let i = 0; i < laps.length; i++) {
      const lap = laps[i];
      const startStr = lap.getAttribute("StartTime");
      if (startStr && !firstTime) firstTime = new Date(startStr);

      const lapDur = num(text(lap, "TotalTimeSeconds")) ?? 0;
      const lapDist = num(text(lap, "DistanceMeters")) ?? 0;
      const lapHrEl = lap.getElementsByTagName("AverageHeartRateBpm")[0];
      const lapHr = num(lapHrEl ? text(lapHrEl, "Value") : null);
      const lapMaxEl = lap.getElementsByTagName("MaximumHeartRateBpm")[0];
      const lapMax = num(lapMaxEl ? text(lapMaxEl, "Value") : null);
      const lapCal = num(text(lap, "Calories")) ?? 0;

      totalDistance += lapDist;
      totalDuration += lapDur;
      calories += lapCal;
      if (lapHr) {
        hrSum += lapHr * lapDur;
        hrCount += lapDur;
      }
      if (lapMax && lapMax > maxHr) maxHr = lapMax;

      splits.push({
        split_index: i + 1,
        distance_meters: Math.round(lapDist),
        duration_seconds: Math.round(lapDur),
        average_pace_sec_per_km: paceSecPerKm(lapDist, lapDur),
        average_heart_rate: lapHr ? Math.round(lapHr) : null,
      });
    }

    if (!firstTime) firstTime = new Date();

    const activity: ParsedActivity = {
      activity_type: kind,
      start_time: firstTime.toISOString(),
      duration_seconds: Math.round(totalDuration),
      distance_meters: Math.round(totalDistance),
      average_pace_sec_per_km: paceSecPerKm(totalDistance, totalDuration),
      average_speed_kmh: speedKmh(totalDistance, totalDuration),
      average_heart_rate: hrCount > 0 ? Math.round(hrSum / hrCount) : null,
      max_heart_rate: maxHr || null,
      calories: calories || null,
      splits,
      raw_summary: { laps: laps.length, sport },
    };
    return { status: "PARSED", fileType: "TCX", activity };
  } catch (e) {
    return { status: "FAILED", fileType: "TCX", error: (e as Error).message };
  }
}

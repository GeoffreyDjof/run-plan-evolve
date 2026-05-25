import type { ParseResult, ParsedActivity, ParsedSplit } from "./types";
import { haversine, paceSecPerKm, speedKmh } from "./geo";

export function parseGPX(xml: string): ParseResult {
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) {
      return { status: "FAILED", fileType: "GPX", error: "Invalid XML" };
    }
    const trkpts = Array.from(doc.getElementsByTagName("trkpt"));
    if (trkpts.length < 2) {
      return { status: "FAILED", fileType: "GPX", error: "No track points found" };
    }

    let distance = 0;
    let elevationGain = 0;
    let prevLat: number | null = null;
    let prevLon: number | null = null;
    let prevEle: number | null = null;
    let firstTime: Date | null = null;
    let lastTime: Date | null = null;

    // Splits per km
    const splits: ParsedSplit[] = [];
    let splitDistance = 0;
    let splitElev = 0;
    let splitStartTime: Date | null = null;

    for (const pt of trkpts) {
      const lat = parseFloat(pt.getAttribute("lat") || "0");
      const lon = parseFloat(pt.getAttribute("lon") || "0");
      const timeEl = pt.getElementsByTagName("time")[0];
      const eleEl = pt.getElementsByTagName("ele")[0];
      const time = timeEl?.textContent ? new Date(timeEl.textContent) : null;
      const ele = eleEl?.textContent ? parseFloat(eleEl.textContent) : null;

      if (prevLat !== null && prevLon !== null) {
        const seg = haversine(prevLat, prevLon, lat, lon);
        distance += seg;
        splitDistance += seg;
        if (prevEle !== null && ele !== null && ele > prevEle) {
          elevationGain += ele - prevEle;
          splitElev += ele - prevEle;
        }
      }
      if (time) {
        if (!firstTime) firstTime = time;
        if (!splitStartTime) splitStartTime = time;
        lastTime = time;

        while (splitDistance >= 1000) {
          const overshoot = splitDistance - 1000;
          const splitDur = Math.round((time.getTime() - splitStartTime.getTime()) / 1000);
          splits.push({
            split_index: splits.length + 1,
            distance_meters: 1000,
            duration_seconds: splitDur,
            average_pace_sec_per_km: paceSecPerKm(1000, splitDur),
            elevation_gain_meters: Math.round(splitElev),
          });
          splitDistance = overshoot;
          splitElev = 0;
          splitStartTime = time;
        }
      }
      prevLat = lat;
      prevLon = lon;
      prevEle = ele;
    }

    // tail partial split
    if (splitDistance > 50 && splitStartTime && lastTime) {
      const splitDur = Math.round((lastTime.getTime() - splitStartTime.getTime()) / 1000);
      splits.push({
        split_index: splits.length + 1,
        distance_meters: Math.round(splitDistance),
        duration_seconds: splitDur,
        average_pace_sec_per_km: paceSecPerKm(splitDistance, splitDur),
        elevation_gain_meters: Math.round(splitElev),
      });
    }

    if (!firstTime || !lastTime) {
      return { status: "FAILED", fileType: "GPX", error: "Missing timestamps" };
    }
    const duration = Math.round((lastTime.getTime() - firstTime.getTime()) / 1000);
    const activity: ParsedActivity = {
      activity_type: "RUN",
      start_time: firstTime.toISOString(),
      duration_seconds: duration,
      distance_meters: Math.round(distance),
      average_pace_sec_per_km: paceSecPerKm(distance, duration),
      average_speed_kmh: speedKmh(distance, duration),
      elevation_gain_meters: Math.round(elevationGain),
      splits,
      raw_summary: { points: trkpts.length },
    };
    return { status: "PARSED", fileType: "GPX", activity };
  } catch (e) {
    return { status: "FAILED", fileType: "GPX", error: (e as Error).message };
  }
}

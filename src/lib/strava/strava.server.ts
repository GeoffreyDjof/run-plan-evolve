// Server-only helpers for Strava OAuth & API.
// Do NOT import this file from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STRAVA_OAUTH = "https://www.strava.com/oauth/token";
const STRAVA_API = "https://www.strava.com/api/v3";

export type StravaTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // seconds since epoch
  athlete?: { id: number };
  scope?: string;
};

export function getStravaCreds() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const verifyToken = process.env.STRAVA_VERIFY_TOKEN;
  if (!clientId || !clientSecret || !verifyToken) {
    throw new Error("Strava credentials are not configured");
  }
  return { clientId, clientSecret, verifyToken };
}

export async function exchangeCodeForTokens(code: string): Promise<StravaTokens> {
  const { clientId, clientSecret } = getStravaCreds();
  const res = await fetch(STRAVA_OAUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Strava token exchange failed [${res.status}]: ${t}`);
  }
  return (await res.json()) as StravaTokens;
}

async function refreshAccessToken(refreshToken: string): Promise<StravaTokens> {
  const { clientId, clientSecret } = getStravaCreds();
  const res = await fetch(STRAVA_OAUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Strava token refresh failed [${res.status}]: ${t}`);
  }
  return (await res.json()) as StravaTokens;
}

/**
 * Returns a valid access token for the given Strava connection row id.
 * Refreshes & persists if it's expired or close to expiring.
 */
export async function getValidAccessTokenForConnection(connectionId: string): Promise<string> {
  const { data: conn, error } = await supabaseAdmin
    .from("strava_connections")
    .select("id, refresh_token, access_token, expires_at")
    .eq("id", connectionId)
    .single();
  if (error || !conn) throw new Error("Strava connection not found");

  const expiresAtMs = new Date(conn.expires_at).getTime();
  // Refresh if expires in less than 2 minutes
  if (expiresAtMs - Date.now() > 120_000) {
    return conn.access_token;
  }

  const t = await refreshAccessToken(conn.refresh_token);
  await supabaseAdmin
    .from("strava_connections")
    .update({
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at: new Date(t.expires_at * 1000).toISOString(),
    })
    .eq("id", conn.id);
  return t.access_token;
}

export async function fetchStravaActivity(activityId: number, accessToken: string) {
  const res = await fetch(`${STRAVA_API}/activities/${activityId}?include_all_efforts=false`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Strava fetch activity failed [${res.status}]: ${t}`);
  }
  return (await res.json()) as StravaActivity;
}

export type StravaActivity = {
  id: number;
  name?: string;
  type?: string; // legacy
  sport_type?: string; // newer; "Run", "Ride", "Walk", "WeightTraining", ...
  start_date: string;
  timezone?: string;
  elapsed_time: number;
  moving_time?: number;
  distance: number;
  average_speed?: number; // m/s
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain?: number;
  average_cadence?: number;
  calories?: number;
};

export function mapStravaTypeToKind(t?: string): "RUN" | "RIDE" | "WALK" | "STRENGTH" | "OTHER" {
  const s = (t ?? "").toLowerCase();
  if (s.includes("run")) return "RUN";
  if (s.includes("ride") || s === "virtualride" || s === "ebikeride") return "RIDE";
  if (s.includes("walk") || s === "hike") return "WALK";
  if (s.includes("weight") || s.includes("workout") || s.includes("crossfit")) return "STRENGTH";
  return "OTHER";
}

/** Insert a Strava activity into imported_activities (idempotent via strava_activity_id unique). */
export async function ingestStravaActivity(params: {
  userId: string;
  activity: StravaActivity;
}): Promise<{ inserted: boolean; activityRowId?: string }> {
  const { userId, activity: a } = params;

  // Idempotency
  const { data: existing } = await supabaseAdmin
    .from("imported_activities")
    .select("id")
    .eq("strava_activity_id", a.id)
    .maybeSingle();
  if (existing) return { inserted: false, activityRowId: existing.id };

  const kind = mapStravaTypeToKind(a.sport_type ?? a.type);
  const avgPace =
    a.average_speed && a.average_speed > 0 ? Math.round(1000 / a.average_speed) : null;
  const avgKmh = a.average_speed ? +(a.average_speed * 3.6).toFixed(2) : null;

  const { data: inserted, error } = await supabaseAdmin
    .from("imported_activities")
    .insert({
      user_id: userId,
      source_type: "STRAVA",
      original_filename: a.name ?? `Strava ${a.id}`,
      file_type: "UNKNOWN",
      activity_type: kind,
      start_time: a.start_date,
      timezone: a.timezone ?? null,
      duration_seconds: a.elapsed_time,
      moving_time_seconds: a.moving_time ?? null,
      distance_meters: a.distance,
      average_pace_sec_per_km: avgPace,
      average_speed_kmh: avgKmh,
      average_heart_rate: a.average_heartrate ? Math.round(a.average_heartrate) : null,
      max_heart_rate: a.max_heartrate ? Math.round(a.max_heartrate) : null,
      elevation_gain_meters: a.total_elevation_gain ?? null,
      average_cadence: a.average_cadence ? Math.round(a.average_cadence) : null,
      calories: a.calories ?? null,
      strava_activity_id: a.id,
      raw_summary: a as any,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { inserted: true, activityRowId: inserted.id };
}

// ---------- Webhook subscription management ----------
const PUSH_SUBS_URL = "https://www.strava.com/api/v3/push_subscriptions";

export async function createPushSubscription(callbackUrl: string): Promise<{ id: number }> {
  const { clientId, clientSecret, verifyToken } = getStravaCreds();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    callback_url: callbackUrl,
    verify_token: verifyToken,
  });
  const res = await fetch(PUSH_SUBS_URL, { method: "POST", body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Strava subscription create failed [${res.status}]: ${JSON.stringify(json)}`);
  }
  return json as { id: number };
}

export async function listPushSubscriptions(): Promise<Array<{ id: number; callback_url: string }>> {
  const { clientId, clientSecret } = getStravaCreds();
  const u = new URL(PUSH_SUBS_URL);
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("client_secret", clientSecret);
  const res = await fetch(u);
  if (!res.ok) throw new Error(`Strava list subs failed [${res.status}]`);
  return (await res.json()) as Array<{ id: number; callback_url: string }>;
}

export async function deletePushSubscription(id: number): Promise<void> {
  const { clientId, clientSecret } = getStravaCreds();
  const u = new URL(`${PUSH_SUBS_URL}/${id}`);
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("client_secret", clientSecret);
  const res = await fetch(u, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Strava delete sub failed [${res.status}]`);
  }
}

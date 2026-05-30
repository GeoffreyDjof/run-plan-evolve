import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStravaEnabled, isStravaSyncEnabled } from "@/lib/integrations/strava/flag.server";
import {
  exchangeCodeForTokens,
  createPushSubscription,
  deletePushSubscription,
  listPushSubscriptions,
  getStravaCreds,
} from "@/lib/integrations/strava/strava.server";

/** Public flag for the client — no secrets, no tokens. */
export const getStravaIntegrationStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { enabled: isStravaSyncEnabled() };
});

export const getStravaPublicConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    assertStravaEnabled();
    const { clientId } = getStravaCreds();
    return { clientId };
  });

export const getStravaStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertStravaEnabled();
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("strava_connections")
      .select("athlete_id, scope, subscription_id, last_sync_at, created_at")
      .eq("user_id", userId)
      .maybeSingle();
    return { connected: !!data, connection: data ?? null };
  });

export const connectStravaWithCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(1).max(2048) }).parse(d))
  .handler(async ({ data, context }) => {
    assertStravaEnabled();
    const { supabase, userId } = context;
    const t = await exchangeCodeForTokens(data.code);
    if (!t.athlete?.id) throw new Error("Strava did not return an athlete id");

    const { error } = await supabase
      .from("strava_connections")
      .upsert(
        {
          user_id: userId,
          athlete_id: t.athlete.id,
          access_token: t.access_token,
          refresh_token: t.refresh_token,
          expires_at: new Date(t.expires_at * 1000).toISOString(),
          scope: t.scope ?? null,
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, athleteId: t.athlete.id };
  });

export const disconnectStrava = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertStravaEnabled();
    const { supabase, userId } = context;
    const { data: conn } = await supabase
      .from("strava_connections")
      .select("subscription_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (conn?.subscription_id) {
      try { await deletePushSubscription(conn.subscription_id); } catch { /* ignore */ }
    }
    await supabase.from("strava_connections").delete().eq("user_id", userId);
    return { ok: true };
  });

export const subscribeStravaWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ callbackUrl: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    assertStravaEnabled();
    const { supabase, userId } = context;
    const existing = await listPushSubscriptions().catch(() => []);
    const reuse = existing.find((s) => s.callback_url === data.callbackUrl);
    const sub = reuse ?? (await createPushSubscription(data.callbackUrl));
    const { error } = await supabase
      .from("strava_connections")
      .update({ subscription_id: sub.id })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true, subscriptionId: sub.id, reused: !!reuse };
  });

export const unsubscribeStravaWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertStravaEnabled();
    const { supabase, userId } = context;
    const { data: conn } = await supabase
      .from("strava_connections")
      .select("subscription_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (conn?.subscription_id) {
      await deletePushSubscription(conn.subscription_id);
      await supabase
        .from("strava_connections")
        .update({ subscription_id: null })
        .eq("user_id", userId);
    }
    return { ok: true };
  });

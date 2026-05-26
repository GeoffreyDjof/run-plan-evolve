import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getStravaCreds,
  getValidAccessTokenForConnection,
  fetchStravaActivity,
  ingestStravaActivity,
} from "@/lib/strava/strava.server";

export const Route = createFileRoute("/api/public/strava/webhook")({
  server: {
    handlers: {
      // Webhook validation handshake
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const { verifyToken } = getStravaCreds();
        if (mode === "subscribe" && token === verifyToken && challenge) {
          return Response.json({ "hub.challenge": challenge });
        }
        return new Response("Forbidden", { status: 403 });
      },

      // Activity events
      POST: async ({ request }) => {
        let evt: {
          object_type?: string;
          object_id?: number;
          aspect_type?: string;
          owner_id?: number;
        };
        try {
          evt = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        // Always ACK fast — Strava retries on non-2xx.
        // We process inline (fast enough for a single user) but swallow errors.
        try {
          if (
            evt.object_type === "activity" &&
            (evt.aspect_type === "create" || evt.aspect_type === "update") &&
            evt.owner_id &&
            evt.object_id
          ) {
            const { data: conn } = await supabaseAdmin
              .from("strava_connections")
              .select("id, user_id")
              .eq("athlete_id", evt.owner_id)
              .maybeSingle();
            if (conn) {
              const token = await getValidAccessTokenForConnection(conn.id);
              const activity = await fetchStravaActivity(evt.object_id, token);
              await ingestStravaActivity({ userId: conn.user_id, activity });
              await supabaseAdmin
                .from("strava_connections")
                .update({ last_sync_at: new Date().toISOString() })
                .eq("id", conn.id);
            }
          }
        } catch (err) {
          console.error("[strava webhook] error:", err);
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});

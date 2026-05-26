import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getMyProfile, updateProfile, resetPlan } from "@/lib/api/training.functions";
import {
  getStravaStatus,
  getStravaPublicConfig,
  connectStravaWithCode,
  disconnectStrava,
  subscribeStravaWebhook,
  unsubscribeStravaWebhook,
} from "@/lib/api/strava.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, RotateCcw, Link2, Unlink, Radio } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
});

function Settings() {
  const navigate = useNavigate();
  const fp = useServerFn(getMyProfile);
  const up = useServerFn(updateProfile);
  const rp = useServerFn(resetPlan);
  const { data: profile, refetch } = useQuery({ queryKey: ["profile"], queryFn: () => fp() });
  const [vma, setVma] = useState(14);
  const [raceDate, setRaceDate] = useState("");
  const [target, setTarget] = useState("");

  useEffect(() => {
    if (profile) {
      setVma(Number(profile.vma_kmh));
      setRaceDate(profile.race_date ?? "");
      setTarget(profile.target_10k_time ?? "");
    }
  }, [profile]);

  const updateMut = useMutation({
    mutationFn: () => up({ data: { vma_kmh: vma, race_date: raceDate, target_10k_time: target } }),
    onSuccess: () => { toast.success("Updated"); refetch(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const resetMut = useMutation({
    mutationFn: () => rp(),
    onSuccess: () => { toast.success("Plan reset"); navigate({ to: "/onboarding" }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  // ---------- Strava ----------
  const gss = useServerFn(getStravaStatus);
  const gsp = useServerFn(getStravaPublicConfig);
  const csc = useServerFn(connectStravaWithCode);
  const dis = useServerFn(disconnectStrava);
  const sub = useServerFn(subscribeStravaWebhook);
  const unsub = useServerFn(unsubscribeStravaWebhook);
  const { data: stravaStatus, refetch: refetchStrava } = useQuery({
    queryKey: ["strava-status"],
    queryFn: () => gss(),
  });
  const { data: stravaCfg } = useQuery({ queryKey: ["strava-cfg"], queryFn: () => gsp() });

  // Capture ?code= after Strava OAuth redirect
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const stravaScope = url.searchParams.get("scope");
    if (code && stravaScope?.includes("activity")) {
      csc({ data: { code } })
        .then(() => { toast.success("Strava connecté"); refetchStrava(); })
        .catch((e) => toast.error((e as Error).message))
        .finally(() => {
          url.searchParams.delete("code");
          url.searchParams.delete("scope");
          url.searchParams.delete("state");
          window.history.replaceState({}, "", url.pathname + (url.search ? "?" + url.searchParams.toString() : ""));
        });
    }
  }, [csc, refetchStrava]);

  const connectStrava = () => {
    if (!stravaCfg?.clientId) { toast.error("Strava non configuré"); return; }
    const redirect = `${window.location.origin}/settings`;
    const u = new URL("https://www.strava.com/oauth/authorize");
    u.searchParams.set("client_id", stravaCfg.clientId);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("redirect_uri", redirect);
    u.searchParams.set("approval_prompt", "auto");
    u.searchParams.set("scope", "read,activity:read_all");
    window.location.href = u.toString();
  };

  const disconnectMut = useMutation({
    mutationFn: () => dis(),
    onSuccess: () => { toast.success("Strava déconnecté"); refetchStrava(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const subscribeMut = useMutation({
    mutationFn: () => sub({ data: { callbackUrl: `${window.location.origin}/api/public/strava/webhook` } }),
    onSuccess: () => { toast.success("Synchro auto activée"); refetchStrava(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const unsubMut = useMutation({
    mutationFn: () => unsub(),
    onSuccess: () => { toast.success("Synchro auto désactivée"); refetchStrava(); },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!profile) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="px-5 pt-8 pb-6 max-w-md mx-auto space-y-5">
      <h1 className="text-3xl font-bold">Settings</h1>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Training</h2>
        <div><Label>VMA (km/h)</Label><Input type="number" step="0.1" value={vma} onChange={(e) => setVma(+e.target.value)} /></div>
        <div><Label>Race date</Label><Input type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} /></div>
        <div><Label>Target 10K time</Label><Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="45:00" /></div>
        <Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending} className="w-full">Save</Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Radio className="h-4 w-4" />Strava
        </h2>
        {!stravaStatus?.connected ? (
          <>
            <p className="text-xs text-muted-foreground">
              Connecte ton compte Strava pour importer automatiquement tes activités.
            </p>
            <Button onClick={connectStrava} className="w-full">
              <Link2 className="h-4 w-4 mr-2" />Connecter Strava
            </Button>
          </>
        ) : (
          <>
            <div className="text-xs text-muted-foreground">
              Athlète #{stravaStatus.connection?.athlete_id}
              {stravaStatus.connection?.last_sync_at && (
                <> · dernière synchro {new Date(stravaStatus.connection.last_sync_at).toLocaleString()}</>
              )}
            </div>
            {stravaStatus.connection?.subscription_id ? (
              <Button variant="outline" onClick={() => unsubMut.mutate()} disabled={unsubMut.isPending} className="w-full">
                Désactiver la synchro auto
              </Button>
            ) : (
              <Button onClick={() => subscribeMut.mutate()} disabled={subscribeMut.isPending} className="w-full">
                Activer la synchro auto (webhook)
              </Button>
            )}
            <Button variant="ghost" onClick={() => disconnectMut.mutate()} disabled={disconnectMut.isPending} className="w-full text-destructive">
              <Unlink className="h-4 w-4 mr-2" />Déconnecter Strava
            </Button>
          </>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Account</h2>
        <div className="text-sm text-muted-foreground">{profile.name}</div>
        <Button variant="outline" onClick={() => resetMut.mutate()} disabled={resetMut.isPending} className="w-full">
          <RotateCcw className="h-4 w-4 mr-2" />Reset plan
        </Button>
        <Button variant="ghost" onClick={signOut} className="w-full text-destructive">
          <LogOut className="h-4 w-4 mr-2" />Sign out
        </Button>
      </section>
    </div>
  );
}

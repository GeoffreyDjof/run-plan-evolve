import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getMyProfile, updateProfile, resetPlan } from "@/lib/api/training.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
});

type Sex = "male" | "female" | "other";
type Objective = "5k" | "10k" | "semi" | "marathon";
type Level = "RETURNING" | "REGULAR" | "ADVANCED";

function Settings() {
  const navigate = useNavigate();
  const fp = useServerFn(getMyProfile);
  const up = useServerFn(updateProfile);
  const rp = useServerFn(resetPlan);
  const { data: profile, refetch } = useQuery({ queryKey: ["profile"], queryFn: () => fp() });

  const [name, setName] = useState("");
  const [age, setAge] = useState<string>("");
  const [sex, setSex] = useState<Sex | "">("");
  const [vma, setVma] = useState<string>("14");
  const [objectiveType, setObjectiveType] = useState<Objective>("10k");
  const [objectiveDate, setObjectiveDate] = useState("");
  const [level, setLevel] = useState<Level>("REGULAR");
  const [sessions, setSessions] = useState<string>("3");

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setAge(profile.age != null ? String(profile.age) : "");
      setSex((profile.sex as Sex) ?? "");
      setVma(String(profile.vma_kmh ?? 14));
      setObjectiveType(((profile as any).objective_type as Objective) ?? "10k");
      setObjectiveDate((profile as any).objective_date ?? profile.race_date ?? "");
      setLevel((profile.current_level as Level) ?? "REGULAR");
      setSessions(String(profile.sessions_per_week ?? 3));
    }
  }, [profile]);

  const updateMut = useMutation({
    mutationFn: () => {
      const vmaNum = parseFloat(vma);
      const ageNum = parseInt(age || "0", 10);
      const sessionsNum = parseInt(sessions || "0", 10);
      if (!name.trim()) throw new Error("Nom requis");
      if (!(ageNum >= 10 && ageNum <= 99)) throw new Error("Âge invalide");
      if (!(vmaNum >= 5 && vmaNum <= 25)) throw new Error("VMA invalide (5–25 km/h)");
      if (!objectiveDate) throw new Error("Date d'objectif requise");
      if (!(sessionsNum >= 3 && sessionsNum <= 4)) throw new Error("3 ou 4 séances par semaine");
      return up({
        data: {
          name: name.trim(),
          age: ageNum,
          sex: sex || null,
          vma_kmh: vmaNum,
          objective_type: objectiveType,
          objective_date: objectiveDate,
          race_date: objectiveDate, // keep legacy in sync for plan logic
          current_level: level,
          sessions_per_week: sessionsNum,
        },
      });
    },
    onSuccess: () => { toast.success("Profil mis à jour"); refetch(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const resetMut = useMutation({
    mutationFn: () => rp(),
    onSuccess: () => { toast.success("Plan réinitialisé"); navigate({ to: "/onboarding" }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (!profile) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="px-5 pt-8 pb-6 max-w-md mx-auto space-y-5">
      <h1 className="text-3xl font-bold">Profil & Réglages</h1>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Athlète</h2>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nom">
            <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Âge">
            <Input type="number" min={10} max={99} value={age} onChange={(e) => setAge(e.target.value)} />
          </Field>
          <Field label="Sexe">
            <Select value={sex || "unset"} onValueChange={(v) => setSex(v === "unset" ? "" : (v as Sex))}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">—</SelectItem>
                <SelectItem value="male">Homme</SelectItem>
                <SelectItem value="female">Femme</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Niveau actuel">
            <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="RETURNING">Reprise</SelectItem>
                <SelectItem value="REGULAR">Normal</SelectItem>
                <SelectItem value="ADVANCED">Avancé</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Entraînement</h2>
        <div className="grid grid-cols-2 gap-2">
          <Field label="VMA (km/h)">
            <Input type="number" step="0.1" min={5} max={25} value={vma} onChange={(e) => setVma(e.target.value)} />
          </Field>
          <Field label="Séances / semaine">
            <Select value={sessions} onValueChange={setSessions}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Objectif">
            <Select value={objectiveType} onValueChange={(v) => setObjectiveType(v as Objective)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5k">5 km</SelectItem>
                <SelectItem value="10k">10 km</SelectItem>
                <SelectItem value="semi">Semi-marathon</SelectItem>
                <SelectItem value="marathon">Marathon</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date de l'objectif">
            <Input type="date" value={objectiveDate} onChange={(e) => setObjectiveDate(e.target.value)} />
          </Field>
        </div>
        <Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending} className="w-full">
          Enregistrer
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Compte</h2>
        <Button variant="outline" onClick={() => resetMut.mutate()} disabled={resetMut.isPending} className="w-full">
          <RotateCcw className="h-4 w-4 mr-2" />Réinitialiser le plan
        </Button>
        <Button variant="ghost" onClick={signOut} className="w-full text-destructive">
          <LogOut className="h-4 w-4 mr-2" />Se déconnecter
        </Button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

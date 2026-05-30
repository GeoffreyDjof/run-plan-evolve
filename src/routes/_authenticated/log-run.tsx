import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { logManualRun } from "@/lib/api/activities.functions";
import { getPlanWorkouts } from "@/lib/api/training.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/log-run")({
  component: LogRunPage,
});

function todayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function fmtPace(distanceKm: number, durationMin: number) {
  if (!distanceKm || !durationMin) return "—";
  const secPerKm = (durationMin * 60) / distanceKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm - m * 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

function LogRunPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const save = useServerFn(logManualRun);
  const fetchPlan = useServerFn(getPlanWorkouts);
  const { data: plan } = useQuery({ queryKey: ["plan"], queryFn: () => fetchPlan() });

  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState("");
  const [distance, setDistance] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [hr, setHr] = useState<string>("");
  const [rpe, setRpe] = useState<number>(5);
  const [notes, setNotes] = useState("");
  const [workoutId, setWorkoutId] = useState<string>("none");

  const distanceKm = parseFloat(distance || "0");
  const durationMin = parseFloat(duration || "0");
  const pace = useMemo(() => fmtPace(distanceKm, durationMin), [distanceKm, durationMin]);

  // Filter: ± 7 days around the chosen date, not already completed
  const candidates = useMemo(() => {
    const list = plan?.workouts ?? [];
    const target = new Date(date + "T00:00:00").getTime();
    return list
      .filter((w) => Math.abs(new Date(w.scheduled_date + "T00:00:00").getTime() - target) <= 7 * 86400000)
      .filter((w) => w.status === "PLANNED" || w.status === "RESCHEDULED")
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  }, [plan, date]);

  const mut = useMutation({
    mutationFn: () =>
      save({
        data: {
          date,
          time: time || undefined,
          distance_km: distanceKm,
          duration_min: durationMin,
          average_hr: hr ? parseInt(hr, 10) : null,
          rpe,
          notes: notes || undefined,
          workout_id: workoutId !== "none" ? workoutId : null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["plan"] });
      qc.invalidateQueries({ queryKey: ["planned-vs-actual"] });
      qc.invalidateQueries({ queryKey: ["activity-summary"] });
      toast.success("Sortie ajoutée");
      if (workoutId !== "none") navigate({ to: "/workout/$id", params: { id: workoutId } });
      else navigate({ to: "/activities" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const submit = () => {
    if (!(distanceKm > 0)) return toast.error("Distance invalide");
    if (!(durationMin > 0)) return toast.error("Durée invalide");
    mut.mutate();
  };

  return (
    <div className="px-5 pt-6 pb-6 max-w-md mx-auto space-y-5">
      <button onClick={() => navigate({ to: "/dashboard" })} className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <header>
        <h1 className="text-3xl font-bold">Ajouter une sortie</h1>
        <p className="text-sm text-muted-foreground mt-1">Saisie manuelle d'une course réalisée.</p>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayIso()} />
          </Field>
          <Field label="Heure (optionnel)">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Distance (km)">
            <Input type="number" inputMode="decimal" step="0.01" min="0" value={distance}
              onChange={(e) => setDistance(e.target.value)} placeholder="10.0" />
          </Field>
          <Field label="Durée (min)">
            <Input type="number" inputMode="decimal" step="1" min="0" value={duration}
              onChange={(e) => setDuration(e.target.value)} placeholder="50" />
          </Field>
          <Field label="Allure moyenne">
            <div className="h-10 px-3 flex items-center rounded-md border border-border bg-muted/40 text-sm tabular">
              {pace}
            </div>
          </Field>
          <Field label="FC moyenne (bpm)">
            <Input type="number" inputMode="numeric" min="30" max="240" value={hr}
              onChange={(e) => setHr(e.target.value)} placeholder="—" />
          </Field>
        </div>

        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Ressenti (RPE) : {rpe}</Label>
          <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(+e.target.value)} className="w-full accent-primary mt-1" />
        </div>

        <Field label="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Sensations, conditions, parcours…" />
        </Field>

        <Field label="Lier à une séance prévue (optionnel)">
          <Select value={workoutId} onValueChange={setWorkoutId}>
            <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune liaison</SelectItem>
              {candidates.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {new Date(w.scheduled_date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · {w.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {candidates.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">Aucune séance prévue à ±7 jours.</p>
          )}
        </Field>
      </section>

      <Button onClick={submit} disabled={mut.isPending} className="w-full h-12">
        <Save className="h-4 w-4 mr-2" />Enregistrer
      </Button>

      <Link to="/upload" className="block text-center text-xs text-muted-foreground underline">
        Ou importer un fichier GPX/TCX/FIT
      </Link>
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

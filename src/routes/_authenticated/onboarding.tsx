import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { completeOnboarding } from "@/lib/api/training.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { kmhToPace, paceFromVMA } from "@/lib/training/paces";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LEVELS = [
  { v: "RETURNING", l: "Returning runner" },
  { v: "REGULAR", l: "Regular runner" },
  { v: "ADVANCED", l: "Advanced" },
] as const;

function Onboarding() {
  const navigate = useNavigate();
  const fn = useServerFn(completeOnboarding);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState(44);
  const [vma, setVma] = useState(14);
  const [raceDate, setRaceDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 12 * 7); return d.toISOString().slice(0, 10);
  });
  const [sessions, setSessions] = useState<3 | 4>(3);
  const [days, setDays] = useState<string[]>(["Tue", "Thu", "Sun"]);
  const [level, setLevel] = useState<"RETURNING" | "REGULAR" | "ADVANCED">("REGULAR");
  const [cross, setCross] = useState(false);
  const [target10k, setTarget10k] = useState("");

  const m = useMutation({
    mutationFn: () => fn({
      data: {
        name, age, vma_kmh: vma, race_date: raceDate, sessions_per_week: sessions,
        preferred_days: days, current_level: level, cross_training_available: cross,
        target_10k_time: target10k || null,
      },
    }),
    onSuccess: () => { toast.success("Plan generated!"); navigate({ to: "/dashboard" }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleDay = (d: string) => {
    setDays((prev) => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const canNext = (() => {
    if (step === 1) return name.length > 0 && age > 0;
    if (step === 2) return vma >= 8 && vma <= 22;
    if (step === 3) return !!raceDate;
    if (step === 4) return days.length >= sessions;
    return true;
  })();

  return (
    <div className="min-h-screen flex flex-col px-5 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Activity className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold tracking-tight">Pace</span>
        <span className="ml-auto text-xs text-muted-foreground tabular">Step {step} / 5</span>
      </div>
      <div className="h-1 rounded-full bg-muted mb-8 overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${(step / 5) * 100}%` }} />
      </div>

      {step === 1 && (
        <div className="space-y-5 flex-1">
          <h1 className="text-2xl font-semibold">Tell us about you</h1>
          <div className="space-y-1.5"><Label>Your name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" /></div>
          <div className="space-y-1.5"><Label>Age</Label>
            <Input type="number" value={age} onChange={(e) => setAge(+e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Current level</Label>
            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map((l) => (
                <button key={l.v} onClick={() => setLevel(l.v)} type="button"
                  className={cn("rounded-lg border p-3 text-xs text-center",
                    level === l.v ? "border-primary bg-primary/10 text-primary" : "border-border")}>
                  {l.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 flex-1">
          <h1 className="text-2xl font-semibold">What's your VMA?</h1>
          <p className="text-sm text-muted-foreground">Maximal aerobic speed in km/h. If unsure, use 14.</p>
          <div className="space-y-1.5"><Label>VMA (km/h)</Label>
            <Input type="number" step="0.1" value={vma} onChange={(e) => setVma(+e.target.value)} /></div>
          <div className="rounded-xl border border-border p-4 bg-card">
            <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Your paces</div>
            <div className="grid grid-cols-2 gap-3 text-sm tabular">
              <div><div className="text-muted-foreground">Easy</div><div className="font-medium">{paceFromVMA(vma, 70).paceStr}/km</div></div>
              <div><div className="text-muted-foreground">Threshold</div><div className="font-medium">{paceFromVMA(vma, 85).paceStr}/km</div></div>
              <div><div className="text-muted-foreground">10K Pace</div><div className="font-medium">{paceFromVMA(vma, 90).paceStr}/km</div></div>
              <div><div className="text-muted-foreground">VMA</div><div className="font-medium">{kmhToPace(vma)}/km</div></div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5 flex-1">
          <h1 className="text-2xl font-semibold">Race day</h1>
          <div className="space-y-1.5"><Label>Race date</Label>
            <Input type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Target 10K time (optional)</Label>
            <Input value={target10k} onChange={(e) => setTarget10k(e.target.value)} placeholder="e.g. 45:00" /></div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5 flex-1">
          <h1 className="text-2xl font-semibold">Training schedule</h1>
          <div className="space-y-1.5"><Label>Sessions per week</Label>
            <div className="grid grid-cols-2 gap-2">
              {[3, 4].map((n) => (
                <button key={n} type="button" onClick={() => setSessions(n as 3 | 4)}
                  className={cn("rounded-lg border p-3 font-medium",
                    sessions === n ? "border-primary bg-primary/10 text-primary" : "border-border")}>
                  {n} runs
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5"><Label>Preferred days (pick at least {sessions})</Label>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map((d) => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={cn("rounded-lg border py-3 text-xs font-medium",
                    days.includes(d) ? "border-primary bg-primary/10 text-primary" : "border-border")}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5 flex-1">
          <h1 className="text-2xl font-semibold">One more thing</h1>
          <label className="flex items-start gap-3 rounded-xl border border-border p-4 cursor-pointer">
            <input type="checkbox" checked={cross} onChange={(e) => setCross(e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
            <div>
              <div className="font-medium">Cross-training available</div>
              <div className="text-xs text-muted-foreground">Allow bike/swim as a 4th easy session.</div>
            </div>
          </label>
          <div className="rounded-xl border border-border p-4 bg-card">
            <div className="text-xs text-muted-foreground mb-3 uppercase">Summary</div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd>{name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">VMA</dt><dd className="tabular">{vma} km/h</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Race</dt><dd className="tabular">{raceDate}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Sessions/week</dt><dd>{sessions}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Days</dt><dd>{days.join(", ")}</dd></div>
            </dl>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-6">
        {step > 1 && <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(step - 1)}>Back</Button>}
        {step < 5 ? (
          <Button className="flex-1 h-12" disabled={!canNext} onClick={() => setStep(step + 1)}>Continue</Button>
        ) : (
          <Button className="flex-1 h-12" disabled={m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Generating…" : "Generate my plan"}
          </Button>
        )}
      </div>
    </div>
  );
}

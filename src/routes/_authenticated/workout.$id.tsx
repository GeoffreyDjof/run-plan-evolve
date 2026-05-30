import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  getWorkout, getMyProfile, logWorkoutCompletion,
  rescheduleWorkout, replaceWorkout, getWorkoutComparison,
} from "@/lib/api/training.functions";
import { WorkoutTypeBadge, StatusChip } from "@/components/badges";
import { COMPARISON_STATUS_LABEL, paceSecToString, type ComparisonStatus } from "@/lib/activities/comparison";
import { paceRangeFromVMA } from "@/lib/training/paces";
import { equivalentWorkouts } from "@/lib/training/alternatives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter,
} from "@/components/ui/drawer";
import { CheckCircle2, RefreshCw, CalendarClock, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workout/$id")({
  component: WorkoutDetail,
});

function WorkoutDetail() {
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetchWorkout = useServerFn(getWorkout);
  const fetchProfile = useServerFn(getMyProfile);
  const { data, isLoading } = useQuery({ queryKey: ["workout", id], queryFn: () => fetchWorkout({ data: { id } }) });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  if (isLoading || !profile) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-6">Not found</div>;
  const w = data.workout;
  const range = paceRangeFromVMA(Number(profile.vma_kmh), Number(w.target_vma_min_percent), Number(w.target_vma_max_percent));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["workout", id] });
    qc.invalidateQueries({ queryKey: ["plan"] });
  };

  return (
    <div className="px-5 pt-6 pb-6 max-w-md mx-auto space-y-5">
      <button onClick={() => navigate({ to: "/calendar" })} className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <WorkoutTypeBadge type={w.workout_type as any} />
          <StatusChip status={w.status as any} />
        </div>
        <h1 className="text-2xl font-bold">{w.title}</h1>
        <p className="text-sm text-muted-foreground">{w.objective}</p>
        <p className="text-xs text-muted-foreground tabular">{new Date(w.scheduled_date).toDateString()}</p>
      </header>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Box label="Duration" value={`${w.estimated_duration_minutes}m`} />
        <Box label="Pace" value={`${range.paceMin}–${range.paceMax}`} />
        <Box label="Load" value={String(w.estimated_load ?? "—")} />
      </div>

      <Section title="Warm-up" body={w.warmup} />
      <Section title="Main set" body={w.main_set} highlight />
      <Section title="Recovery" body={w.recovery} />
      <Section title="Cool-down" body={w.cooldown} />
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Target zone</div>
        <div className="text-sm tabular">
          {w.target_vma_min_percent}–{w.target_vma_max_percent}% VMA
          {" · "}{range.kmhMin}–{range.kmhMax} km/h
          {" · "}{range.paceMin}–{range.paceMax}/km
        </div>
      </div>
      {w.notes && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <div className="text-xs uppercase tracking-wider text-primary mb-1">Coach note</div>
          {w.notes}
        </div>
      )}

      <div className="space-y-2 pt-2">
        <CompleteDrawer workoutId={id} durationGuess={w.estimated_duration_minutes ?? 45} onDone={invalidate} />
        <ReplaceDrawer workout={w} onDone={invalidate} />
        <RescheduleDrawer workout={w} onDone={invalidate} />
      </div>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className="text-sm font-semibold tabular mt-0.5">{value}</div>
    </div>
  );
}

function Section({ title, body, highlight }: { title: string; body: string | null; highlight?: boolean }) {
  if (!body) return null;
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{title}</div>
      <div className="text-sm whitespace-pre-line">{body}</div>
    </div>
  );
}

function CompleteDrawer({ workoutId, durationGuess, onDone }: { workoutId: string; durationGuess: number; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"FULL" | "PARTIAL" | "NONE">("FULL");
  const [duration, setDuration] = useState(durationGuess);
  const [distance, setDistance] = useState<number | "">("");
  const [pace, setPace] = useState("");
  const [rpe, setRpe] = useState(6);
  const [pain, setPain] = useState<"NONE" | "MILD" | "MODERATE" | "SEVERE">("NONE");
  const [fatigue, setFatigue] = useState<"LOW" | "NORMAL" | "HIGH">("NORMAL");
  const [sleep, setSleep] = useState<"GOOD" | "AVERAGE" | "POOR">("AVERAGE");
  const [comment, setComment] = useState("");
  const fn = useServerFn(logWorkoutCompletion);
  const m = useMutation({
    mutationFn: () => fn({ data: {
      workout_id: workoutId, completed_status: status,
      actual_duration_minutes: duration, actual_distance_km: distance === "" ? undefined : Number(distance),
      average_pace: pace || undefined, rpe, pain_level: pain, fatigue_level: fatigue,
      sleep_quality: sleep, comment: comment || undefined,
    } }),
    onSuccess: () => { toast.success("Logged!"); setOpen(false); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button className="w-full h-12 text-base"><CheckCircle2 className="h-4 w-4 mr-2" />Mark completed</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="max-w-md mx-auto w-full">
          <DrawerHeader><DrawerTitle>How did it go?</DrawerTitle></DrawerHeader>
          <div className="px-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <Pills label="Completed" value={status} onChange={setStatus} options={[["FULL","Fully"],["PARTIAL","Partial"],["NONE","Skipped"]]} />
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Duration (min)</Label><Input type="number" value={duration} onChange={(e) => setDuration(+e.target.value)} /></div>
              <div><Label>Distance (km)</Label><Input type="number" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value === "" ? "" : +e.target.value)} /></div>
            </div>
            <div><Label>Average pace</Label><Input value={pace} onChange={(e) => setPace(e.target.value)} placeholder="5:20" /></div>
            <div><Label>RPE: {rpe}</Label>
              <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(+e.target.value)} className="w-full accent-primary" /></div>
            <Pills label="Pain" value={pain} onChange={setPain} options={[["NONE","None"],["MILD","Mild"],["MODERATE","Moderate"],["SEVERE","Severe"]]} />
            <Pills label="Fatigue" value={fatigue} onChange={setFatigue} options={[["LOW","Low"],["NORMAL","Normal"],["HIGH","High"]]} />
            <Pills label="Sleep" value={sleep} onChange={setSleep} options={[["GOOD","Good"],["AVERAGE","Avg"],["POOR","Poor"]]} />
            <div><Label>Notes</Label><Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} /></div>
          </div>
          <DrawerFooter>
            <Button onClick={() => m.mutate()} disabled={m.isPending} className="h-12">Save log</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Pills<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: [T, string][];
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="grid grid-cols-4 gap-1.5 mt-1">
        {options.map(([v, l]) => (
          <button key={v} type="button" onClick={() => onChange(v)}
            className={`rounded-md border py-2 text-xs ${value === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReplaceDrawer({ workout, onDone }: { workout: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const fn = useServerFn(replaceWorkout);
  const m = useMutation({
    mutationFn: (idx: number) => fn({ data: { id: workout.id, template_index: idx } }),
    onSuccess: () => { toast.success("Replaced"); setOpen(false); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const alts = equivalentWorkouts(workout.workout_type);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="w-full h-12"><RefreshCw className="h-4 w-4 mr-2" />Replace with equivalent</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="max-w-md mx-auto w-full">
          <DrawerHeader><DrawerTitle>Equivalent workouts</DrawerTitle></DrawerHeader>
          <div className="px-4 space-y-2 max-h-[60vh] overflow-y-auto pb-4">
            {alts.map((a, i) => (
              <button key={i} onClick={() => m.mutate(i)} disabled={m.isPending}
                className="w-full text-left rounded-lg border border-border p-3 hover:border-primary/30">
                <div className="flex items-center gap-2 mb-1"><WorkoutTypeBadge type={a.type} /></div>
                <div className="font-medium text-sm">{a.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{a.main_set}</div>
                <div className="text-xs text-muted-foreground tabular mt-1">{a.duration} min · {a.reason}</div>
              </button>
            ))}
            {alts.length === 0 && <p className="text-sm text-muted-foreground">No alternatives.</p>}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function RescheduleDrawer({ workout, onDone }: { workout: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(workout.scheduled_date);
  const fn = useServerFn(rescheduleWorkout);
  const m = useMutation({
    mutationFn: () => fn({ data: { id: workout.id, date } }),
    onSuccess: () => { toast.success("Rescheduled"); setOpen(false); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" className="w-full h-12"><CalendarClock className="h-4 w-4 mr-2" />Reschedule</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="max-w-md mx-auto w-full">
          <DrawerHeader><DrawerTitle>Move workout</DrawerTitle></DrawerHeader>
          <div className="px-4 space-y-3">
            <Label>New date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <DrawerFooter>
            <Button onClick={() => m.mutate()} disabled={m.isPending} className="h-12">Save</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

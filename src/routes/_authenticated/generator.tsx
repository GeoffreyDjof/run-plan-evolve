import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { generateAndSaveWorkout, getMyProfile } from "@/lib/api/training.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkoutTypeBadge } from "@/components/badges";
import { paceRangeFromVMA } from "@/lib/training/paces";
import type { WorkoutType } from "@/lib/training/types";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/generator")({
  component: Generator,
});

const TYPES: WorkoutType[] = ["VMA_SHORT","VMA_LONG","THRESHOLD","TEN_K_PACE","EASY","LONG_RUN","HILLS","RECOVERY"];

function Generator() {
  const qc = useQueryClient();
  const fn = useServerFn(generateAndSaveWorkout);
  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const [type, setType] = useState<WorkoutType>("VMA_LONG");
  const [time, setTime] = useState(60);
  const [difficulty, setDifficulty] = useState<"EASIER"|"NORMAL"|"HARDER">("NORMAL");
  const [terrain, setTerrain] = useState<"ROAD"|"TRACK"|"TREADMILL"|"HILLY">("ROAD");
  const [monotony, setMonotony] = useState<"CLASSIC"|"VARIED"|"PLAYFUL">("CLASSIC");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [preview, setPreview] = useState<any>(null);

  const previewMut = useMutation({
    mutationFn: () => fn({ data: { type, availableTime: time, difficulty, terrain, monotony, scheduled_date: date, save: false } }),
    onSuccess: (r) => setPreview(r.preview),
    onError: (e) => toast.error((e as Error).message),
  });
  const saveMut = useMutation({
    mutationFn: () => fn({ data: { type, availableTime: time, difficulty, terrain, monotony, scheduled_date: date, save: true } }),
    onSuccess: () => { toast.success("Workout added to plan"); qc.invalidateQueries({ queryKey: ["plan"] }); setPreview(null); },
    onError: (e) => toast.error((e as Error).message),
  });

  const range = profile && preview
    ? paceRangeFromVMA(Number(profile.vma_kmh), Number(preview.target_vma_min_percent), Number(preview.target_vma_max_percent))
    : null;

  return (
    <div className="px-5 pt-8 pb-6 max-w-md mx-auto space-y-5">
      <header>
        <h1 className="text-3xl font-bold">Generate workout</h1>
        <p className="text-sm text-muted-foreground mt-1">Custom session matching your plan.</p>
      </header>

      <div className="space-y-1.5">
        <Label>Workout type</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`rounded-md border py-2 text-[11px] ${type===t?"border-primary bg-primary/10 text-primary":"border-border text-muted-foreground"}`}>
              {t.replace("_"," ")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><Label>Time (min)</Label><Input type="number" value={time} onChange={(e) => setTime(+e.target.value)} /></div>
        <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>

      <Choice label="Difficulty" value={difficulty} onChange={setDifficulty} options={[["EASIER","Easier"],["NORMAL","Normal"],["HARDER","Harder"]]} />
      <Choice label="Terrain" value={terrain} onChange={setTerrain} options={[["ROAD","Road"],["TRACK","Track"],["TREADMILL","Mill"],["HILLY","Hilly"]]} />
      <Choice label="Style" value={monotony} onChange={setMonotony} options={[["CLASSIC","Classic"],["VARIED","Varied"],["PLAYFUL","Playful"]]} />

      <Button onClick={() => previewMut.mutate()} disabled={previewMut.isPending} className="w-full h-12">
        <Sparkles className="h-4 w-4 mr-2" />Preview
      </Button>

      {preview && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2"><WorkoutTypeBadge type={preview.workout_type} /></div>
          <h3 className="font-bold">{preview.title}</h3>
          <div className="text-sm space-y-1">
            <div><span className="text-muted-foreground">Warm-up:</span> {preview.warmup}</div>
            <div><span className="text-muted-foreground">Main:</span> {preview.main_set}</div>
            <div><span className="text-muted-foreground">Cool-down:</span> {preview.cooldown}</div>
          </div>
          {range && <div className="text-xs tabular text-muted-foreground">Pace {range.paceMin}–{range.paceMax}/km · {preview.estimated_duration_minutes} min · load {preview.estimated_load}</div>}
          <ul className="text-xs space-y-1 text-muted-foreground border-t border-border pt-2">
            {preview.reasoning.map((r: string, i: number) => <li key={i}>• {r}</li>)}
          </ul>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="w-full">Add to plan</Button>
        </div>
      )}
    </div>
  );
}

const GRID_COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

function Choice<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: [T, string][];
}) {
  const cols = GRID_COLS[options.length] ?? "grid-cols-3";
  return (
    <div>
      <Label>{label}</Label>
      <div className={`grid ${cols} gap-1.5 mt-1`}>
        {options.map(([v, l]) => (
          <button key={v} type="button" onClick={() => onChange(v)}
            className={`rounded-md border py-2 text-xs ${value===v?"border-primary bg-primary/10 text-primary":"border-border text-muted-foreground"}`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}


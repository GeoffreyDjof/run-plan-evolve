import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, FileText, AlertCircle, CheckCircle2, X, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { parseActivityFile, detectFileType, formatDuration, formatPace, type ParseResult, type ParsedActivity } from "@/lib/activities";
import { saveActivity } from "@/lib/api/activities.functions";

export const Route = createFileRoute("/_authenticated/upload")({
  component: UploadPage,
});

const ACCEPT = ".fit,.gpx,.tcx,.csv";

function UploadPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const save = useServerFn(saveActivity);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [edited, setEdited] = useState<ParsedActivity | null>(null);
  const [rpe, setRpe] = useState<string>("");
  const [pain, setPain] = useState<string>("NONE");
  const [fatigue, setFatigue] = useState<string>("NORMAL");
  const [comment, setComment] = useState("");

  const mut = useMutation({
    mutationFn: (vars: { match: boolean }) => {
      if (!file || !edited || !result) throw new Error("Nothing to save");
      return save({
        data: {
          parsed: edited as any,
          filename: file.name,
          fileType: result.fileType,
          fileSize: file.size,
          match: vars.match,
          feedback: {
            rpe: rpe ? parseInt(rpe, 10) : null,
            pain_level: pain as any,
            fatigue_level: fatigue as any,
            comment: comment || null,
          },
        },
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["plan"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["planned-vs-actual"] });
      if (res.match) {
        const label = res.match.status === "AUTO_MATCHED" ? "Auto-matched" : "Needs review";
        toast.success(`Saved. ${label} (confidence ${res.match.confidence})`);
      } else {
        toast.success("Activity saved");
      }
      navigate({ to: "/activities" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  async function handleFile(f: File) {
    setFile(f);
    setParsing(true);
    setResult(null);
    setEdited(null);
    const r = await parseActivityFile(f);
    setResult(r);
    if (r.activity) setEdited(r.activity);
    setParsing(false);
  }

  function reset() {
    setFile(null); setResult(null); setEdited(null); setRpe(""); setPain("NONE"); setFatigue("NORMAL"); setComment("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="px-5 pt-8 pb-6 max-w-md mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Upload activity</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Drop a file from your watch or app. We'll parse it and offer to match it to a planned workout.
        </p>
      </header>

      {!file && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:border-primary/40",
          )}
        >
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <div className="font-medium">Drag &amp; drop your file</div>
          <div className="text-xs text-muted-foreground mt-1">or tap to browse — .fit, .gpx, .tcx, .csv</div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}

      {file && (
        <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{file.name}</div>
            <div className="text-xs text-muted-foreground">
              {detectFileType(file.name)} · {(file.size / 1024).toFixed(1)} KB
            </div>
          </div>
          <button onClick={reset} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {parsing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Parsing file…
        </div>
      )}

      {result && result.status !== "PARSED" && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-warning">
              {result.status === "UNSUPPORTED" ? "Not supported" : "Could not parse"}
            </div>
            <div className="text-muted-foreground mt-1">{result.error}</div>
          </div>
        </div>
      )}

      {edited && (
        <PreviewForm
          activity={edited}
          onChange={setEdited}
          rpe={rpe} setRpe={setRpe}
          pain={pain} setPain={setPain}
          fatigue={fatigue} setFatigue={setFatigue}
          comment={comment} setComment={setComment}
        />
      )}

      {edited && (
        <div className="space-y-2">
          <Button className="w-full h-12" disabled={mut.isPending} onClick={() => mut.mutate({ match: true })}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Save &amp; match to planned workout
          </Button>
          <Button variant="secondary" className="w-full h-11" disabled={mut.isPending} onClick={() => mut.mutate({ match: false })}>
            Save activity only
          </Button>
          <Button variant="ghost" className="w-full" disabled={mut.isPending} onClick={reset}>
            Cancel
          </Button>
        </div>
      )}

      <div className="rounded-lg bg-muted/30 p-3 flex gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
        <p>Files are only imported when you manually upload them. No Garmin, Strava, OAuth, tokens, or external sync are used.</p>
      </div>
    </div>
  );
}

function PreviewForm({
  activity, onChange, rpe, setRpe, pain, setPain, fatigue, setFatigue, comment, setComment,
}: {
  activity: ParsedActivity;
  onChange: (a: ParsedActivity) => void;
  rpe: string; setRpe: (v: string) => void;
  pain: string; setPain: (v: string) => void;
  fatigue: string; setFatigue: (v: string) => void;
  comment: string; setComment: (v: string) => void;
}) {
  const distanceKm = (activity.distance_meters / 1000).toFixed(2);
  const dateTimeLocal = new Date(activity.start_time).toISOString().slice(0, 16);
  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Review &amp; correct</h2>

      <div className="grid grid-cols-2 gap-2 text-center">
        <Tile label="Distance" value={`${distanceKm} km`} />
        <Tile label="Duration" value={formatDuration(activity.duration_seconds)} />
        <Tile label="Avg pace" value={formatPace(activity.average_pace_sec_per_km)} />
        <Tile label="Avg HR" value={activity.average_heart_rate ? `${activity.average_heart_rate} bpm` : "—"} />
        <Tile label="Max HR" value={activity.max_heart_rate ? `${activity.max_heart_rate} bpm` : "—"} />
        <Tile label="Elevation" value={activity.elevation_gain_meters != null ? `${Math.round(activity.elevation_gain_meters)} m` : "—"} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Activity type">
          <Select value={activity.activity_type} onValueChange={(v) => onChange({ ...activity, activity_type: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["RUN", "RIDE", "WALK", "STRENGTH", "OTHER"] as const).map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Date / time">
          <Input type="datetime-local" value={dateTimeLocal}
            onChange={(e) => onChange({ ...activity, start_time: new Date(e.target.value).toISOString() })} />
        </Field>
        <Field label="Distance (km)">
          <Input type="number" step="0.01" value={distanceKm}
            onChange={(e) => onChange({ ...activity, distance_meters: Math.round(parseFloat(e.target.value || "0") * 1000) })} />
        </Field>
        <Field label="Duration (min)">
          <Input type="number" value={Math.round(activity.duration_seconds / 60)}
            onChange={(e) => onChange({ ...activity, duration_seconds: parseInt(e.target.value || "0", 10) * 60 })} />
        </Field>
        <Field label="Avg HR">
          <Input type="number" value={activity.average_heart_rate ?? ""}
            onChange={(e) => onChange({ ...activity, average_heart_rate: e.target.value ? parseInt(e.target.value, 10) : null })} />
        </Field>
        <Field label="Max HR">
          <Input type="number" value={activity.max_heart_rate ?? ""}
            onChange={(e) => onChange({ ...activity, max_heart_rate: e.target.value ? parseInt(e.target.value, 10) : null })} />
        </Field>
        <Field label="Elevation gain (m)">
          <Input type="number" value={activity.elevation_gain_meters != null ? Math.round(activity.elevation_gain_meters) : ""}
            onChange={(e) => onChange({ ...activity, elevation_gain_meters: e.target.value ? parseFloat(e.target.value) : null })} />
        </Field>
        <Field label="RPE (1–10)">
          <Input type="number" min={1} max={10} value={rpe} onChange={(e) => setRpe(e.target.value)} />
        </Field>
        <Field label="Pain">
          <Select value={pain} onValueChange={setPain}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["NONE", "MILD", "MODERATE", "SEVERE"].map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Fatigue">
          <Select value={fatigue} onValueChange={setFatigue}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["LOW", "NORMAL", "HIGH"].map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Comment">
        <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Any notes…" />
      </Field>

      {activity.splits.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Splits</div>
          <div className="rounded-lg border border-border max-h-40 overflow-auto divide-y divide-border">
            {activity.splits.map((s) => (
              <div key={s.split_index} className="flex justify-between text-xs px-3 py-1.5 tabular">
                <span>#{s.split_index} · {(s.distance_meters / 1000).toFixed(2)} km</span>
                <span>{formatDuration(s.duration_seconds)} · {formatPace(s.average_pace_sec_per_km)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular mt-0.5">{value}</div>
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

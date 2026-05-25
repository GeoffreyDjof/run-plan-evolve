import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlannedVsActual } from "@/lib/api/activities.functions";
import { WorkoutTypeBadge } from "@/components/badges";
import { formatDuration, formatPace } from "@/lib/activities";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planned-vs-actual")({
  component: PvAPage,
});

function PvAPage() {
  const fn = useServerFn(getPlannedVsActual);
  const { data, isLoading } = useQuery({ queryKey: ["planned-vs-actual"], queryFn: () => fn() });

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  const rows = (data?.rows ?? []).filter((r) => r.activity || r.workout.status === "COMPLETED");

  return (
    <div className="px-5 pt-8 pb-6 max-w-md mx-auto space-y-5">
      <header>
        <h1 className="text-3xl font-bold">Planned vs Actual</h1>
        <p className="text-sm text-muted-foreground mt-1">How your runs compared to the plan.</p>
      </header>

      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Upload activities to see comparisons here.
        </div>
      )}

      <div className="space-y-3">
        {rows.map(({ workout: w, activity: a, feedback: fb, compliance }) => (
          <div key={w.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <WorkoutTypeBadge type={w.workout_type as any} />
                <span className="text-xs text-muted-foreground">{w.scheduled_date}</span>
              </div>
              {compliance && <ComplianceBadge band={compliance.band} score={compliance.score} />}
            </div>
            <div className="text-sm font-medium">{w.title}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Row label="Planned duration" value={`${w.estimated_duration_minutes ?? "—"} min`} />
              <Row label="Actual duration" value={a ? formatDuration(a.duration_seconds) : "—"} />
              <Row label="Planned pace" value={w.target_pace_min && w.target_pace_max ? `${w.target_pace_min}–${w.target_pace_max}` : "—"} />
              <Row label="Actual pace" value={a ? formatPace(a.average_pace_sec_per_km) : "—"} />
              <Row label="Distance" value={a ? `${(Number(a.distance_meters) / 1000).toFixed(2)} km` : "—"} />
              <Row label="RPE" value={fb?.rpe ? String(fb.rpe) : "—"} />
            </div>
            {fb && (fb.pain_level !== "NONE" || fb.fatigue_level === "HIGH") && (
              <div className="text-xs text-warning">
                {fb.pain_level !== "NONE" && `Pain: ${fb.pain_level}. `}
                {fb.fatigue_level === "HIGH" && "High fatigue."}
              </div>
            )}
            {compliance && compliance.notes.length > 0 && (
              <div className="text-[11px] text-muted-foreground">{compliance.notes.join(" · ")}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/40 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular font-medium">{value}</span>
    </div>
  );
}

function ComplianceBadge({ band, score }: { band: string; score: number }) {
  const map: Record<string, string> = {
    EXCELLENT: "bg-success/20 text-success",
    GOOD: "bg-success/15 text-success",
    ACCEPTABLE: "bg-warning/20 text-warning",
    DIVERGENT: "bg-destructive/20 text-destructive",
  };
  return (
    <span className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full", map[band])}>
      {score}
    </span>
  );
}

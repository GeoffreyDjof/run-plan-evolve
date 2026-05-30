import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listActivities } from "@/lib/api/activities.functions";
import { formatDuration, formatPace } from "@/lib/activities";
import { Upload, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/activities")({
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const fn = useServerFn(listActivities);
  const { data, isLoading } = useQuery({ queryKey: ["activities"], queryFn: () => fn() });

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  const activities = data?.activities ?? [];
  const matchByAct = new Map<string, any>();
  for (const m of data?.matches ?? []) {
    if (m.match_status === "REJECTED") continue;
    const cur = matchByAct.get(m.imported_activity_id);
    if (!cur || m.confidence_score > cur.confidence_score) matchByAct.set(m.imported_activity_id, m);
  }

  return (
    <div className="px-5 pt-8 pb-6 max-w-md mx-auto space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Historique</h1>
          <p className="text-sm text-muted-foreground mt-1">Sorties réalisées (saisie manuelle ou fichier).</p>
        </div>
        <Link to="/log-run">
          <Button size="sm"><Upload className="h-4 w-4 mr-2" />Ajouter</Button>
        </Link>
      </header>

      {activities.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No activities yet. Upload a GPX, TCX or CSV file to get started.
        </div>
      )}

      <div className="space-y-2">
        {activities.map((a) => {
          const m = matchByAct.get(a.id);
          return (
            <div key={a.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="text-sm font-medium">
                  {a.activity_type} · {(Number(a.distance_meters) / 1000).toFixed(2)} km
                </div>
                <MatchBadge match={m} />
              </div>
              <div className="text-xs text-muted-foreground tabular">
                {new Date(a.start_time).toLocaleString()} · {formatDuration(a.duration_seconds)} · {formatPace(a.average_pace_sec_per_km)}
              </div>
              {m && (
                <div className="text-xs text-muted-foreground mt-1">
                  Confidence {m.confidence_score} — {m.match_reason}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchBadge({ match }: { match: any }) {
  if (!match) {
    return <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Unmatched</span>;
  }
  const map: Record<string, { cls: string; icon: any; label: string }> = {
    AUTO_MATCHED: { cls: "bg-success/15 text-success", icon: CheckCircle2, label: "Matched" },
    MANUALLY_MATCHED: { cls: "bg-success/15 text-success", icon: CheckCircle2, label: "Matched" },
    NEEDS_REVIEW: { cls: "bg-warning/15 text-warning", icon: AlertTriangle, label: "Needs review" },
    REJECTED: { cls: "bg-muted text-muted-foreground", icon: HelpCircle, label: "Unmatched" },
  };
  const { cls, icon: Icon, label } = map[match.match_status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full", cls)}>
      <Icon className="h-3 w-3" />{label}
    </span>
  );
}

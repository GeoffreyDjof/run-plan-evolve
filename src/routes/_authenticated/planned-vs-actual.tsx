import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listWorkoutComparisons } from "@/lib/api/training.functions";
import { WorkoutTypeBadge } from "@/components/badges";
import { COMPARISON_STATUS_LABEL, paceSecToString, type ComparisonStatus } from "@/lib/activities/comparison";

export const Route = createFileRoute("/_authenticated/planned-vs-actual")({
  component: PvAPage,
});

const TONE: Record<ComparisonStatus, string> = {
  on_track: "border-success/30 bg-success/5 text-success",
  too_fast: "border-warning/30 bg-warning/5 text-warning",
  too_slow: "border-warning/30 bg-warning/5 text-warning",
  incomplete: "border-destructive/30 bg-destructive/5 text-destructive",
  overdone: "border-warning/30 bg-warning/5 text-warning",
};

function PvAPage() {
  const fn = useServerFn(listWorkoutComparisons);
  const { data, isLoading } = useQuery({ queryKey: ["planned-vs-actual"], queryFn: () => fn() });

  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement…</div>;
  const rows = data?.rows ?? [];

  return (
    <div className="px-5 pt-8 pb-6 max-w-md mx-auto space-y-5">
      <header>
        <h1 className="text-3xl font-bold">Prévu vs Réalisé</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comparaison entre vos séances planifiées et vos sorties réalisées (saisie manuelle ou fichier importé).
        </p>
      </header>

      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Aucune comparaison pour l'instant. Saisissez une sortie réalisée ou importez un fichier d'activité depuis une séance planifiée.
        </div>
      )}

      <div className="space-y-3">
        {rows.map(({ workout: w, comparison: c }: any) => (
          <Link
            key={c.id}
            to="/workout/$id"
            params={{ id: w.id }}
            className={`block rounded-xl border p-3 space-y-2 ${TONE[c.status as ComparisonStatus]}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <WorkoutTypeBadge type={w.workout_type as any} />
                <span className="text-xs opacity-70">{w.scheduled_date}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-semibold">
                {COMPARISON_STATUS_LABEL[c.status as ComparisonStatus]}
              </span>
            </div>
            <div className="text-sm font-medium text-foreground">{w.title}</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Stat label="Distance" value={fmtKm(c.distance_delta_km)} />
              <Stat label="Durée" value={fmtDur(c.duration_delta_sec)} />
              <Stat label="Allure" value={fmtPace(c.pace_delta_sec_per_km)} />
            </div>
            {c.comment && <div className="text-[11px] opacity-80">{c.comment}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="opacity-70">{label}</div>
      <div className="tabular font-medium">{value}</div>
    </div>
  );
}

function fmtKm(v: number | null) {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${Number(v).toFixed(2)} km`;
}
function fmtDur(s: number | null) {
  if (s == null) return "—";
  return `${s > 0 ? "+" : ""}${Math.round(s / 60)} min`;
}
function fmtPace(s: number | null) {
  if (s == null) return "—";
  const sign = s > 0 ? "+" : "-";
  const v = paceSecToString(Math.abs(s));
  return v ? `${sign}${v}/km` : "—";
}

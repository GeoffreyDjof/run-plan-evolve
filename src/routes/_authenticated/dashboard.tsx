import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlanWorkouts, getMyProfile } from "@/lib/api/training.functions";
import { getActivitySummary } from "@/lib/api/activities.functions";
import { WorkoutTypeBadge, StatusChip } from "@/components/badges";
import { paceRangeFromVMA } from "@/lib/training/paces";
import { formatDuration, formatPace } from "@/lib/activities";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, TrendingUp, Calendar, AlertTriangle, Upload, Activity, PlusCircle } from "lucide-react";
import { checkBackToBackHard, checkLoadJump } from "@/lib/training/safety";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const fetchPlan = useServerFn(getPlanWorkouts);
  const fetchProfile = useServerFn(getMyProfile);
  const fetchSummary = useServerFn(getActivitySummary);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data, isLoading } = useQuery({ queryKey: ["plan"], queryFn: () => fetchPlan() });
  const { data: summary } = useQuery({ queryKey: ["activity-summary"], queryFn: () => fetchSummary() });

  if (isLoading || !profile) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!data?.plan) return <div className="p-6 text-muted-foreground">No plan yet.</div>;

  const today = new Date().toISOString().slice(0, 10);
  const todayWorkout = data.workouts.find(w => w.scheduled_date === today);
  const upcoming = data.workouts.filter(w => w.status === "PLANNED" || w.status === "RESCHEDULED");
  const next = todayWorkout ?? upcoming.find(w => w.scheduled_date >= today) ?? upcoming[0];
  void data.workouts.filter(w => w.status === "COMPLETED").length;
  const weekNum = next?.week_number ?? data.plan.current_week;
  const weekWorkouts = data.workouts.filter(w => w.week_number === weekNum);

  // Weekly stats
  const weekDone = weekWorkouts.filter(w => w.status === "COMPLETED").length;
  const weekPlanned = weekWorkouts.length;
  const weekMissed = weekWorkouts.filter(w => w.status === "MISSED").length;
  const pastDueUndone = weekWorkouts.filter(
    w => w.scheduled_date < today && w.status !== "COMPLETED" && w.status !== "PARTIAL" && w.status !== "REPLACED",
  ).length;

  // Status indicator
  const fatigueFlag = (summary?.actualWarnings ?? []).some((w) => /fatigue|pain|douleur/i.test(w.message));
  let weekStatus: { label: string; tone: "ok" | "warn" | "bad" } = { label: "Sur les rails", tone: "ok" };
  if (pastDueUndone >= 2 || weekMissed >= 2) weekStatus = { label: "Retard important", tone: "bad" };
  else if (pastDueUndone === 1 || weekMissed === 1) weekStatus = { label: "Retard léger", tone: "warn" };
  if (fatigueFlag) weekStatus = { label: "Attention fatigue", tone: "warn" };

  const lite = data.workouts.map(w => ({
    id: w.id, scheduled_date: w.scheduled_date,
    workout_type: w.workout_type as any,
    estimated_load: w.estimated_load, status: w.status,
  }));
  const warns = [
    ...checkBackToBackHard(lite),
    ...checkLoadJump(lite),
    ...(summary?.actualWarnings ?? []),
  ].slice(0, 3);
  const matchedSet = new Map((summary?.matchedWorkoutIds ?? []).map((m) => [m.id, m.status]));

  return (
    <div className="px-5 pt-8 pb-6 max-w-md mx-auto space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Hello {profile.name?.split(" ")[0]}</p>
        <h1 className="text-3xl font-bold mt-1">Semaine {weekNum} / 12</h1>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={
              "text-xs uppercase tracking-wider px-2 py-1 rounded-full font-semibold " +
              (weekStatus.tone === "ok"
                ? "bg-success/15 text-success"
                : weekStatus.tone === "warn"
                ? "bg-warning/15 text-warning"
                : "bg-destructive/15 text-destructive")
            }
          >
            {weekStatus.label}
          </span>
          <span className="text-sm text-muted-foreground tabular">
            {weekDone}/{weekPlanned} séances faites
          </span>
        </div>
      </header>


      {warns.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 space-y-1">
          {warns.map((w, i) => (
            <div key={i} className="flex gap-2 text-xs text-warning items-start">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {todayWorkout ? (
        <NextWorkoutCard workout={todayWorkout} vma={Number(profile.vma_kmh)} />
      ) : (
        <RestDayCard nextWorkout={next} />
      )}




      {summary && (
        <section className="grid grid-cols-3 gap-2">
          <Stat icon={<Activity className="h-3.5 w-3.5" />} label="Week km" value={summary.weekDistanceKm.toFixed(1)} />
          <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Week min" value={String(summary.weekDurationMin)} />
          <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} label="RPE load" value={String(summary.weekRpeLoad)} />
        </section>
      )}

      {summary?.latest && (
        <Link to="/activities" className="block rounded-xl border border-border bg-card p-3 hover:border-primary/30">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Latest activity</span>
            <span className="text-[10px] text-muted-foreground">{new Date(summary.latest.start_time).toLocaleDateString()}</span>
          </div>
          <div className="text-sm font-medium">
            {summary.latest.activity_type} · {(Number(summary.latest.distance_meters) / 1000).toFixed(2)} km · {formatDuration(summary.latest.duration_seconds)}
          </div>
          <div className="text-xs text-muted-foreground tabular">{formatPace(summary.latest.average_pace_sec_per_km)}</div>
        </Link>
      )}

      {summary && (summary.unmatchedCount > 0 || summary.needsReviewCount > 0) && (
        <Link to="/activities" className="flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {summary.needsReviewCount > 0 && `${summary.needsReviewCount} activit${summary.needsReviewCount > 1 ? "ies" : "y"} need review. `}
            {summary.unmatchedCount > 0 && `${summary.unmatchedCount} unmatched.`}
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link to="/log-run"><Button className="w-full"><PlusCircle className="h-4 w-4 mr-2" />Ajouter sortie</Button></Link>
        <Link to="/upload"><Button variant="outline" className="w-full"><Upload className="h-4 w-4 mr-2" />Importer fichier</Button></Link>
      </div>
      <Link to="/planned-vs-actual" className="block text-center text-xs text-primary underline">Voir Prévu vs Réalisé →</Link>


      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">This week</h2>
          <Link to="/calendar" className="text-xs text-primary">See calendar →</Link>
        </div>
        <div className="space-y-2">
          {weekWorkouts.map((w) => (
            <Link key={w.id} to="/workout/$id" params={{ id: w.id }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors">
              <div className="flex flex-col items-center justify-center w-12 shrink-0 tabular">
                <span className="text-[10px] text-muted-foreground uppercase">{new Date(w.scheduled_date).toLocaleDateString(undefined, { weekday: "short" })}</span>
                <span className="text-lg font-bold leading-none">{new Date(w.scheduled_date).getDate()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <WorkoutTypeBadge type={w.workout_type as any} />
                  {matchedSet.get(w.id) === "AUTO_MATCHED" || matchedSet.get(w.id) === "MANUALLY_MATCHED" ? (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-success/15 text-success">Matched</span>
                  ) : matchedSet.get(w.id) === "NEEDS_REVIEW" ? (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-warning/15 text-warning">Review</span>
                  ) : null}
                </div>
                <div className="text-sm font-medium truncate">{w.title}</div>
                <div className="text-xs text-muted-foreground tabular">
                  {w.estimated_duration_minutes} min · load {w.estimated_load}
                </div>
              </div>
              <StatusChip status={w.status as any} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function NextWorkoutCard({ workout, vma }: { workout: any; vma: number }) {
  const range = paceRangeFromVMA(vma, Number(workout.target_vma_min_percent), Number(workout.target_vma_max_percent));
  return (
    <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <WorkoutTypeBadge type={workout.workout_type} />
          <h2 className="text-xl font-bold mt-2 leading-tight">{workout.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{workout.objective}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            {new Date(workout.scheduled_date).toLocaleDateString(undefined, { weekday: "short" })}
          </div>
          <div className="text-2xl font-bold tabular">{new Date(workout.scheduled_date).getDate()}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Duration" value={`${workout.estimated_duration_minutes}m`} />
        <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} label="Pace" value={`${range.paceMin}–${range.paceMax}`} />
        <Stat icon={<Calendar className="h-3.5 w-3.5" />} label="Load" value={String(workout.estimated_load ?? "—")} />
      </div>

      <Link to="/workout/$id" params={{ id: workout.id }}>
        <Button className="w-full h-12 text-base">
          <CheckCircle2 className="h-4 w-4 mr-2" /> Open workout
        </Button>
      </Link>
    </div>
  );
}

function RestDayCard({ nextWorkout }: { nextWorkout?: any }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-6 text-center space-y-2">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">Aujourd'hui</div>
      <h2 className="text-3xl font-bold">Repos</h2>
      <p className="text-sm text-muted-foreground">
        Aucune séance programmée aujourd'hui. Profites-en pour récupérer.
      </p>
      {nextWorkout && (
        <p className="text-xs text-muted-foreground pt-2">
          Prochaine séance : {new Date(nextWorkout.scheduled_date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })} · {nextWorkout.title}
        </p>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px] uppercase tracking-wider">
        {icon}{label}
      </div>
      <div className="text-sm font-semibold tabular mt-0.5">{value}</div>
    </div>
  );
}

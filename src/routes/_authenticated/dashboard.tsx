import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlanWorkouts, getMyProfile } from "@/lib/api/training.functions";
import { WorkoutTypeBadge, StatusChip } from "@/components/badges";
import { paceRangeFromVMA } from "@/lib/training/paces";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, TrendingUp, Calendar, AlertTriangle } from "lucide-react";
import { checkBackToBackHard, checkLoadJump } from "@/lib/training/safety";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const fetchPlan = useServerFn(getPlanWorkouts);
  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data, isLoading } = useQuery({ queryKey: ["plan"], queryFn: () => fetchPlan() });

  if (isLoading || !profile) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!data?.plan) return <div className="p-6 text-muted-foreground">No plan yet.</div>;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = data.workouts.filter(w => w.status === "PLANNED" || w.status === "RESCHEDULED");
  const next = upcoming.find(w => w.scheduled_date >= today) ?? upcoming[0];
  const completed = data.workouts.filter(w => w.status === "COMPLETED").length;
  const weekNum = next?.week_number ?? data.plan.current_week;
  const weekWorkouts = data.workouts.filter(w => w.week_number === weekNum);

  const lite = data.workouts.map(w => ({
    id: w.id, scheduled_date: w.scheduled_date,
    workout_type: w.workout_type as any,
    estimated_load: w.estimated_load, status: w.status,
  }));
  const warns = [...checkBackToBackHard(lite), ...checkLoadJump(lite)].slice(0, 2);

  return (
    <div className="px-5 pt-8 pb-6 max-w-md mx-auto space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Hello {profile.name?.split(" ")[0]}</p>
        <h1 className="text-3xl font-bold mt-1">Week {weekNum} of 12</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {completed} completed · {data.workouts.length - completed} to go
        </p>
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

      {next && <NextWorkoutCard workout={next} vma={Number(profile.vma_kmh)} />}

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

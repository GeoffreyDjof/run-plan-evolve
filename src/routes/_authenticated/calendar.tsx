import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlanWorkouts } from "@/lib/api/training.functions";
import { WorkoutTypeBadge, StatusChip } from "@/components/badges";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const fn = useServerFn(getPlanWorkouts);
  const { data, isLoading } = useQuery({ queryKey: ["plan"], queryFn: () => fn() });
  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!data?.plan) return <div className="p-6 text-muted-foreground">No plan.</div>;

  const byWeek: Record<number, typeof data.workouts> = {};
  for (const w of data.workouts) {
    (byWeek[w.week_number] ||= []).push(w);
  }
  const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b);

  return (
    <div className="px-5 pt-8 pb-6 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-1">Calendar</h1>
      <p className="text-sm text-muted-foreground mb-6">12 weeks to race day</p>

      <div className="space-y-5">
        {weeks.map((wn) => {
          const ws = byWeek[wn].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
          const isRecovery = wn === 4 || wn === 8;
          const isTaper = wn === 12;
          return (
            <section key={wn}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-sm">
                  Week {wn}
                  {isRecovery && <span className="ml-2 text-[10px] uppercase text-chart-2">Recovery</span>}
                  {isTaper && <span className="ml-2 text-[10px] uppercase text-primary">Taper / Race</span>}
                </h2>
              </div>
              <div className="space-y-1.5">
                {ws.map((w) => (
                  <Link key={w.id} to="/workout/$id" params={{ id: w.id }}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30">
                    <div className="flex flex-col items-center w-10 shrink-0 tabular">
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {new Date(w.scheduled_date).toLocaleDateString(undefined, { weekday: "short" })}
                      </span>
                      <span className="text-base font-bold leading-none">{new Date(w.scheduled_date).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <WorkoutTypeBadge type={w.workout_type as any} />
                        <StatusChip status={w.status as any} />
                      </div>
                      <div className="text-sm truncate">{w.title}</div>
                    </div>
                    <span className="text-xs text-muted-foreground tabular">{w.estimated_duration_minutes}m</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

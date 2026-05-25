import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProgressData, getMyProfile } from "@/lib/api/training.functions";
import { predicted10kMinutes, formatMinutesToTime } from "@/lib/training/paces";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/_authenticated/progress")({
  component: Progress,
});

function Progress() {
  const fn = useServerFn(getProgressData);
  const fp = useServerFn(getMyProfile);
  const { data, isLoading } = useQuery({ queryKey: ["progress"], queryFn: () => fn() });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fp() });
  if (isLoading || !profile) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!data?.plan) return <div className="p-6 text-muted-foreground">No plan.</div>;

  // weekly stats
  const weekStats: Record<number, { planned: number; completed: number; load: number }> = {};
  for (const w of data.workouts) {
    const s = (weekStats[w.week_number] ||= { planned: 0, completed: 0, load: 0 });
    s.planned += 1;
    if (w.status === "COMPLETED") s.completed += 1;
  }
  for (const l of data.logs) {
    const w = data.workouts.find(x => x.id === l.workout_id);
    if (!w) continue;
    (weekStats[w.week_number] ||= { planned: 0, completed: 0, load: 0 }).load += l.calculated_load ?? 0;
  }
  const chart = Object.keys(weekStats).map(Number).sort((a,b)=>a-b).map(wn => ({ week: `W${wn}`, load: weekStats[wn].load }));

  const totalCompleted = data.workouts.filter(w => w.status === "COMPLETED").length;
  const completionPct = Math.round((totalCompleted / data.workouts.length) * 100);
  const predicted = predicted10kMinutes(Number(profile.vma_kmh));

  return (
    <div className="px-5 pt-8 pb-6 max-w-md mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Progress</h1>
        <p className="text-sm text-muted-foreground mt-1">Week {data.plan.current_week} of 12</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Completion" value={`${completionPct}%`} />
        <Stat label="Sessions done" value={`${totalCompleted}/${data.workouts.length}`} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Weekly training load</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chart}>
            <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="load" fill="var(--primary)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="text-xs uppercase text-primary mb-1">Predicted 10K (rough)</div>
        <div className="text-3xl font-bold tabular">{formatMinutesToTime(predicted)}</div>
        <div className="text-xs text-muted-foreground mt-1">Based on VMA {profile.vma_kmh} km/h. Estimate only.</div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-2">Recent logs</h3>
        <div className="space-y-2">
          {data.logs.slice(0, 5).map(l => (
            <div key={l.id} className="text-xs flex items-center justify-between">
              <span className="text-muted-foreground tabular">{new Date(l.created_at).toLocaleDateString()}</span>
              <span>RPE {l.rpe} · fatigue {l.fatigue_level.toLowerCase()}</span>
              <span className="tabular text-primary">{l.calculated_load}</span>
            </div>
          ))}
          {data.logs.length === 0 && <p className="text-xs text-muted-foreground">Complete a workout to see logs.</p>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tabular mt-1">{value}</div>
    </div>
  );
}

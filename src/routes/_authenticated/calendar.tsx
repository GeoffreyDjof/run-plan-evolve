import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { getPlanWorkouts, rescheduleWorkout } from "@/lib/api/training.functions";
import { WorkoutTypeBadge, StatusChip } from "@/components/badges";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

type Workout = {
  id: string;
  week_number: number;
  scheduled_date: string;
  workout_type: string;
  status: string;
  title: string;
  estimated_duration_minutes: number | null;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function mondayOf(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function CalendarPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fn = useServerFn(getPlanWorkouts);
  const reschedule = useServerFn(rescheduleWorkout);
  const { data, isLoading } = useQuery({ queryKey: ["plan"], queryFn: () => fn() });
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const mut = useMutation({
    mutationFn: (vars: { id: string; date: string }) => reschedule({ data: vars }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["plan"] });
      const prev = qc.getQueryData<any>(["plan"]);
      if (prev) {
        qc.setQueryData(["plan"], {
          ...prev,
          workouts: prev.workouts.map((w: Workout) =>
            w.id === vars.id ? { ...w, scheduled_date: vars.date, status: "RESCHEDULED" } : w,
          ),
        });
      }
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["plan"], ctx.prev);
      toast.error((e as Error).message);
    },
    onSuccess: () => toast.success("Workout rescheduled"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["plan"] }),
  });

  const weeks = useMemo(() => {
    if (!data?.plan) return [];
    const ws = data.workouts as Workout[];
    const byWeek = new Map<number, Workout[]>();
    for (const w of ws) {
      if (!byWeek.has(w.week_number)) byWeek.set(w.week_number, []);
      byWeek.get(w.week_number)!.push(w);
    }
    const planStart = mondayOf(data.plan.start_date);
    return Array.from(byWeek.keys())
      .sort((a, b) => a - b)
      .map((wn) => {
        const monday = addDays(planStart, (wn - 1) * 7);
        const days = Array.from({ length: 7 }, (_, i) => {
          const date = addDays(monday, i);
          const iso = toISO(date);
          return {
            iso,
            label: DAY_LABELS[i],
            dayNum: date.getDate(),
            workouts: (byWeek.get(wn) ?? []).filter((w) => w.scheduled_date === iso),
          };
        });
        return { weekNum: wn, days };
      });
  }, [data]);

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!data?.plan) return <div className="p-6 text-muted-foreground">No plan.</div>;

  const activeWorkout = activeId
    ? (data.workouts as Workout[]).find((w) => w.id === activeId) ?? null
    : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const id = String(e.active.id);
    const overDate = e.over?.id ? String(e.over.id) : null;
    if (!overDate) return;
    const w = (data!.workouts as Workout[]).find((x) => x.id === id);
    if (!w || w.scheduled_date === overDate) return;
    mut.mutate({ id, date: overDate });
  }

  return (
    <div className="px-5 pt-8 pb-6 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-1">Calendar</h1>
      <p className="text-sm text-muted-foreground mb-6">Drag any workout to a different day to reschedule.</p>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="space-y-6">
          {weeks.map(({ weekNum, days }) => {
            const isRecovery = weekNum === 4 || weekNum === 8;
            const isTaper = weekNum === 12;
            return (
              <section key={weekNum}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-sm">
                    Week {weekNum}
                    {isRecovery && <span className="ml-2 text-[10px] uppercase text-chart-2">Recovery</span>}
                    {isTaper && <span className="ml-2 text-[10px] uppercase text-primary">Taper / Race</span>}
                  </h2>
                </div>
                <div className="space-y-1">
                  {days.map((day) => (
                    <DayRow
                      key={day.iso}
                      iso={day.iso}
                      label={day.label}
                      dayNum={day.dayNum}
                      workouts={day.workouts}
                      onOpen={(id) => navigate({ to: "/workout/$id", params: { id } })}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeWorkout ? (
            <div className="rounded-lg border border-primary/50 bg-card p-3 shadow-lg pointer-events-none">
              <div className="flex items-center gap-2 mb-0.5">
                <WorkoutTypeBadge type={activeWorkout.workout_type as any} />
              </div>
              <div className="text-sm truncate">{activeWorkout.title}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function DayRow({
  iso,
  label,
  dayNum,
  workouts,
  onOpen,
}: {
  iso: string;
  label: string;
  dayNum: number;
  workouts: Workout[];
  onOpen: (id: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: iso });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-stretch gap-2 rounded-lg border border-dashed border-transparent transition-colors",
        isOver && "border-primary/60 bg-primary/5",
      )}
    >
      <div className="flex flex-col items-center justify-center w-10 shrink-0 tabular py-2">
        <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
        <span className="text-base font-bold leading-none">{dayNum}</span>
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        {workouts.length === 0 ? (
          <div className="h-12 rounded-lg border border-border/40 bg-muted/20 flex items-center px-3 text-xs text-muted-foreground">
            Rest
          </div>
        ) : (
          workouts.map((w) => (
            <DraggableWorkout key={w.id} workout={w} onOpen={() => onOpen(w.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableWorkout({ workout, onOpen }: { workout: Workout; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: workout.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-card p-2.5",
        isDragging && "opacity-30",
      )}
    >
      <button
        type="button"
        className="touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        aria-label="Drag to reschedule"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-2 mb-0.5">
          <WorkoutTypeBadge type={workout.workout_type as any} />
          <StatusChip status={workout.status as any} />
        </div>
        <div className="text-sm truncate">{workout.title}</div>
      </button>
      <span className="text-xs text-muted-foreground tabular shrink-0">
        {workout.estimated_duration_minutes}m
      </span>
    </div>
  );
}

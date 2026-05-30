import { cn } from "@/lib/utils";
import type { WorkoutType, WorkoutStatus } from "@/lib/training/types";
import { WORKOUT_TYPE_LABELS, HARD_TYPES } from "@/lib/training/types";

const TYPE_COLORS: Record<WorkoutType, string> = {
  VMA_SHORT: "bg-destructive/15 text-destructive border-destructive/30",
  VMA_LONG: "bg-destructive/15 text-destructive border-destructive/30",
  THRESHOLD: "bg-warning/15 text-warning border-warning/30",
  TEN_K_PACE: "bg-warning/15 text-warning border-warning/30",
  HILLS: "bg-warning/15 text-warning border-warning/30",
  EASY: "bg-primary/15 text-primary border-primary/30",
  LONG_RUN: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  RECOVERY: "bg-muted text-muted-foreground border-border",
  TAPER: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  TEST: "bg-destructive/15 text-destructive border-destructive/30",
  RACE: "bg-primary text-primary-foreground border-primary",
};

const STATUS_META: Record<WorkoutStatus, { cls: string; label: string }> = {
  PLANNED:     { cls: "bg-muted text-muted-foreground",           label: "Prévue" },
  COMPLETED:   { cls: "bg-success/20 text-success",                label: "Faite" },
  PARTIAL:     { cls: "bg-warning/20 text-warning",                label: "Partielle" },
  MISSED:      { cls: "bg-destructive/20 text-destructive",        label: "Manquée" },
  RESCHEDULED: { cls: "bg-chart-2/20 text-chart-2",                label: "Déplacée" },
  REPLACED:    { cls: "bg-muted text-muted-foreground line-through", label: "Remplacée" },
};

export function WorkoutTypeBadge({ type }: { type: WorkoutType }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
      TYPE_COLORS[type])}>
      {WORKOUT_TYPE_LABELS[type]}
    </span>
  );
}

export function StatusChip({ status }: { status: WorkoutStatus }) {
  const { cls, label } = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap", cls)}>
      {label}
    </span>
  );
}

export function isHardType(t: WorkoutType): boolean {
  return HARD_TYPES.includes(t);
}

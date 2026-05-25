import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RuleWarning, Severity } from "@/lib/training/rules";

const STYLES: Record<Severity, { wrap: string; icon: typeof Info; label: string }> = {
  INFO: {
    wrap: "border-primary/30 bg-primary/5 text-primary",
    icon: Info,
    label: "Info",
  },
  WARNING: {
    wrap: "border-warning/40 bg-warning/10 text-warning",
    icon: AlertTriangle,
    label: "Warning",
  },
  BLOCKING: {
    wrap: "border-destructive/40 bg-destructive/10 text-destructive",
    icon: ShieldAlert,
    label: "Blocking",
  },
};

export function WarningList({
  warnings,
  className,
}: {
  warnings: RuleWarning[];
  className?: string;
}) {
  if (!warnings.length) return null;
  return (
    <div className={cn("space-y-1.5", className)}>
      {warnings.map((w, i) => {
        const s = STYLES[w.severity];
        const Icon = s.icon;
        return (
          <div
            key={i}
            className={cn("flex gap-2 rounded-lg border px-3 py-2 text-xs", s.wrap)}
          >
            <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div className="flex-1 leading-snug">
              <span className="font-semibold uppercase tracking-wider text-[10px] mr-1.5">
                {s.label}
              </span>
              {w.message}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function hasBlocking(warnings: RuleWarning[]): boolean {
  return warnings.some((w) => w.severity === "BLOCKING");
}

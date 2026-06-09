import type { ReactNode } from "react";
import type { DeltaClassification } from "../../lib/comparison";
import { cn } from "../../lib/utils";

type ComparisonMetricCardProps = {
  label: string;
  baselineValue: string;
  retryValue: string;
  deltaLabel: string;
  classification: DeltaClassification;
  helper?: string;
  icon?: ReactNode;
};

const toneStyles: Record<
  DeltaClassification,
  {
    border: string;
    bg: string;
    text: string;
    badge: string;
    label: string;
  }
> = {
  improved: {
    border: "border-emerald-400/25",
    bg: "bg-emerald-400/[0.05]",
    text: "text-emerald-200",
    badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    label: "improved",
  },
  same: {
    border: "border-zinc-800",
    bg: "bg-zinc-900/45",
    text: "text-zinc-200",
    badge: "border-zinc-700 bg-zinc-900 text-zinc-300",
    label: "steady",
  },
  worse: {
    border: "border-amber-400/30",
    bg: "bg-amber-400/[0.05]",
    text: "text-amber-200",
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    label: "needs more practice",
  },
};

export function ComparisonMetricCard({
  label,
  baselineValue,
  retryValue,
  deltaLabel,
  classification,
  helper,
  icon,
}: ComparisonMetricCardProps) {
  const styles = toneStyles[classification];

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        styles.border,
        styles.bg,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </p>
          {helper && (
            <p className="mt-1 text-xs leading-5 text-zinc-500">{helper}</p>
          )}
        </div>
        {icon && (
          <span className="text-zinc-500" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <ValueColumn label="Baseline" value={baselineValue} />
        <span className="text-xs text-zinc-600" aria-hidden="true">
          to
        </span>
        <ValueColumn label="Retry" value={retryValue} align="right" />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className={cn("text-lg font-semibold leading-none", styles.text)}>
          {deltaLabel}
        </span>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
            styles.badge,
          )}
        >
          {styles.label}
        </span>
      </div>
    </div>
  );
}

function ValueColumn({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: string;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

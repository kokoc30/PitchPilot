import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export type MetricCardStatus = "neutral" | "good" | "warning" | "bad" | "muted";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  helper?: string;
  status?: MetricCardStatus;
  icon?: ReactNode;
  className?: string;
};

const statusStyles: Record<MetricCardStatus, string> = {
  neutral: "border-white/10 bg-white/[0.045]",
  good: "border-emerald-500/25 bg-emerald-500/[0.05]",
  warning: "border-orange-500/25 bg-orange-500/[0.05]",
  bad: "border-red-500/25 bg-red-500/[0.05]",
  muted: "border-white/10 bg-white/[0.03]",
};

const valueStyles: Record<MetricCardStatus, string> = {
  neutral: "text-ink-0",
  good: "text-emerald-400",
  warning: "text-orange-300",
  bad: "text-red-400",
  muted: "text-ink-3",
};

export function MetricCard({
  label,
  value,
  helper,
  status = "neutral",
  icon,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 transition-colors",
        statusStyles[status],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
          {label}
        </p>
        {icon && (
          <span className="mt-0.5 text-ink-3" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-2 font-mono text-[20px] font-medium leading-none tabular-nums",
          valueStyles[status],
        )}
      >
        {value}
      </p>
      {helper && (
        <p className="mt-1.5 text-[11.5px] leading-[1.4] text-ink-3">{helper}</p>
      )}
    </div>
  );
}

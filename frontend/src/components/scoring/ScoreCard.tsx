import type { ReactNode } from "react";
import type { ScoreStatus } from "../../lib/scoring";
import { cn } from "../../lib/utils";

type ScoreTone = "excellent" | "strong" | "developing" | "focus" | "muted";

type ScoreCardProps = {
  label: string;
  score: number;
  status: ScoreStatus;
  helperText?: string;
  icon?: ReactNode;
  className?: string;
};

const toneStyles: Record<
  ScoreTone,
  { border: string; bg: string; value: string; bar: string }
> = {
  excellent: {
    border: "border-emerald-500/25",
    bg: "bg-emerald-500/[0.05]",
    value: "text-emerald-400",
    bar: "bg-emerald-500",
  },
  strong: {
    border: "border-cyan-500/25",
    bg: "bg-cyan-500/[0.05]",
    value: "text-cyan-200",
    bar: "bg-cyan-500",
  },
  developing: {
    border: "border-orange-500/25",
    bg: "bg-orange-500/[0.05]",
    value: "text-orange-300",
    bar: "bg-orange-500",
  },
  focus: {
    border: "border-red-500/25",
    bg: "bg-red-500/[0.05]",
    value: "text-red-400",
    bar: "bg-red-500",
  },
  muted: {
    border: "border-white/10",
    bg: "bg-white/[0.03]",
    value: "text-ink-3",
    bar: "bg-white/20",
  },
};

export function ScoreCard({
  label,
  score,
  status,
  helperText,
  icon,
  className,
}: ScoreCardProps) {
  const isReady = status === "ready" || status === "limited_data";
  const tone = isReady ? scoreTone(score) : "muted";
  const styles = toneStyles[tone];
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        styles.border,
        styles.bg,
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

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={cn("font-mono text-[22px] font-medium leading-none tabular-nums", styles.value)}>
          {isReady ? safeScore : 0}
        </span>
        {isReady && (
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
            /100
          </span>
        )}
      </div>

      <div
        aria-label={`${label} score`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={isReady ? safeScore : 0}
        className="mt-3 h-2 overflow-hidden rounded-full border border-line-2 bg-bg-3"
        role="progressbar"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-out",
            styles.bar,
          )}
          style={{ width: `${isReady ? safeScore : 0}%` }}
        />
      </div>

      {helperText && (
        <p className="mt-2 text-[11.5px] leading-[1.4] text-ink-3">{helperText}</p>
      )}
    </div>
  );
}

function scoreTone(score: number): ScoreTone {
  if (score >= 90) return "excellent";
  if (score >= 75) return "strong";
  if (score >= 60) return "developing";
  return "focus";
}

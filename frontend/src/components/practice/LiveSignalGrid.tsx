/**
 * LiveSignalGrid
 *
 * Polished, score-style metric grid for the realtime dashboard.
 * Frames every value as a "live signal" or "estimate" - not a final score.
 */

import { motion } from "framer-motion";
import {
  Activity,
  Eye,
  Gauge,
  MessageSquareText,
  PauseCircle,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import type { RealtimeMetrics } from "../../hooks/useRealtimeMetrics";
import { cn } from "../../lib/utils";

type SignalTone = "neutral" | "good" | "warning" | "bad" | "muted";

type SignalCardProps = {
  label: string;
  value: ReactNode;
  unit?: ReactNode;
  helper?: ReactNode;
  caption?: string;
  tone?: SignalTone;
  icon?: ReactNode;
  progress?: number; // 0-100
  delay?: number;
};

const toneStyles: Record<SignalTone, {
  border: string;
  bg: string;
  value: string;
  ring: string;
  glow: string;
}> = {
  neutral: {
    border: "border-zinc-800",
    bg: "bg-zinc-900/55",
    value: "text-white",
    ring: "ring-zinc-800",
    glow: "from-zinc-700/0 to-zinc-700/0",
  },
  good: {
    border: "border-emerald-400/25",
    bg: "bg-emerald-400/[0.05]",
    value: "text-emerald-200",
    ring: "ring-emerald-400/15",
    glow: "from-emerald-400/0 via-emerald-400/[0.06] to-emerald-400/0",
  },
  warning: {
    border: "border-amber-400/30",
    bg: "bg-amber-400/[0.05]",
    value: "text-amber-200",
    ring: "ring-amber-400/15",
    glow: "from-amber-400/0 via-amber-400/[0.06] to-amber-400/0",
  },
  bad: {
    border: "border-rose-400/30",
    bg: "bg-rose-400/[0.05]",
    value: "text-rose-200",
    ring: "ring-rose-400/15",
    glow: "from-rose-400/0 via-rose-400/[0.06] to-rose-400/0",
  },
  muted: {
    border: "border-zinc-800",
    bg: "bg-zinc-950/55",
    value: "text-zinc-500",
    ring: "ring-zinc-800",
    glow: "from-zinc-800/0 to-zinc-800/0",
  },
};

// ---------------------------------------------------------------------------------------------------------------------

function SignalCard({
  label,
  value,
  unit,
  helper,
  caption,
  tone = "neutral",
  icon,
  progress,
  delay = 0,
}: SignalCardProps) {
  const styles = toneStyles[tone];
  const safeProgress =
    typeof progress === "number"
      ? Math.max(0, Math.min(100, progress))
      : null;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 ring-1 transition-colors",
        styles.border,
        styles.bg,
        styles.ring,
      )}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.28, delay, ease: "easeOut" }}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r",
          styles.glow,
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {label}
        </p>
        {icon && (
          <span className="text-zinc-500" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={cn("text-2xl font-semibold leading-none", styles.value)}>
          {value}
        </span>
        {unit && (
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {unit}
          </span>
        )}
      </div>

      {helper && (
        <p className="mt-1.5 text-xs leading-4 text-zinc-400">{helper}</p>
      )}

      {safeProgress !== null && (
        <div
          aria-hidden="true"
          className="mt-3 h-1.5 overflow-hidden rounded-full border border-zinc-800/80 bg-zinc-900"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300 ease-out",
              tone === "good"
                ? "bg-emerald-300"
                : tone === "warning"
                  ? "bg-amber-300"
                  : tone === "bad"
                    ? "bg-rose-300"
                    : tone === "muted"
                      ? "bg-zinc-600"
                      : "bg-cyan-300",
            )}
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      )}

      {caption && (
        <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
          {caption}
        </p>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------

function paceTone(metrics: RealtimeMetrics): SignalTone {
  if (metrics.paceStatus === "good") return "good";
  if (metrics.paceStatus === "too_slow") return "warning";
  if (metrics.paceStatus === "too_fast") return "bad";
  return "muted";
}

function paceHelper(metrics: RealtimeMetrics): string {
  if (metrics.paceStatus === "good") return "On a comfortable cadence";
  if (metrics.paceStatus === "too_slow") return "Pick the pace up slightly";
  if (metrics.paceStatus === "too_fast") return "Slow down for clarity";
  return "Target 110-170 WPM";
}

function fillerTone(metrics: RealtimeMetrics): SignalTone {
  if (metrics.fillerWordCount === 0) return "muted";
  if (metrics.fillerRate <= 5) return "good";
  if (metrics.fillerRate <= 12) return "warning";
  return "bad";
}

function pauseTone(metrics: RealtimeMetrics): SignalTone {
  if (metrics.pauseCount === 0) return "muted";
  if (metrics.pauseCount <= 3) return "neutral";
  if (metrics.pauseCount <= 6) return "warning";
  return "bad";
}

function cameraFacingTone(percent: number): SignalTone {
  if (percent >= 75) return "good";
  if (percent >= 50) return "warning";
  if (percent > 0) return "bad";
  return "muted";
}

function engagementTone(metrics: RealtimeMetrics): SignalTone {
  switch (metrics.engagementSignal) {
    case "strong":
      return "good";
    case "steady":
      return "neutral";
    case "low":
      return "bad";
    default:
      return "muted";
  }
}

function engagementLabel(metrics: RealtimeMetrics): string {
  switch (metrics.engagementSignal) {
    case "strong":
      return "Strong";
    case "steady":
      return "Steady";
    case "low":
      return "Low";
    default:
      return "Warming up";
  }
}

// ---------------------------------------------------------------------------------------------------------------------

type LiveSignalGridProps = {
  metrics: RealtimeMetrics;
};

export function LiveSignalGrid({ metrics }: LiveSignalGridProps) {
  const paceValue =
    metrics.paceStatus === "unknown"
      ? "0"
      : metrics.wordsPerMinute.toString();

  const fillerValue =
    metrics.fillerWordCount > 0
      ? metrics.fillerWordCount.toString()
      : "0";

  const fillerHelper =
    metrics.fillerWordCount > 0
      ? `${metrics.fillerRate}% of your words`
      : "Fillers detected while speaking";

  const longestPause =
    metrics.longestPauseSeconds > 0
      ? `${metrics.longestPauseSeconds.toFixed(1)}s longest`
      : metrics.currentPauseSeconds > 0
        ? `${metrics.currentPauseSeconds.toFixed(1)}s active`
        : "Silence < 1.5s threshold";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <SignalCard
        caption="Live signal"
        helper={paceHelper(metrics)}
        icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
        label="Pace"
        progress={
          metrics.paceStatus === "unknown"
            ? undefined
            : Math.min(100, Math.round((metrics.wordsPerMinute / 220) * 100))
        }
        tone={paceTone(metrics)}
        unit="wpm"
        value={paceValue}
        delay={0.02}
      />

      <SignalCard
        caption="Live signal"
        helper={fillerHelper}
        icon={<MessageSquareText className="h-4 w-4" aria-hidden="true" />}
        label="Filler words"
        progress={Math.min(100, metrics.fillerRate * 5)}
        tone={fillerTone(metrics)}
        unit={metrics.fillerWordCount > 0 ? "spoken" : undefined}
        value={fillerValue}
        delay={0.06}
      />

      <SignalCard
        caption="Live signal"
        helper={longestPause}
        icon={<PauseCircle className="h-4 w-4" aria-hidden="true" />}
        label="Pauses"
        progress={Math.min(100, metrics.pauseCount * 14)}
        tone={pauseTone(metrics)}
        unit={metrics.pauseCount === 1 ? "pause" : "pauses"}
        value={metrics.pauseCount}
        delay={0.1}
      />

      <SignalCard
        caption="Live signal"
        helper={`Face visible ${metrics.faceVisiblePercent}%`}
        icon={<Eye className="h-4 w-4" aria-hidden="true" />}
        label="Camera-facing"
        progress={metrics.cameraFacingPercent}
        tone={cameraFacingTone(metrics.cameraFacingPercent)}
        unit="%"
        value={metrics.cameraFacingPercent}
        delay={0.14}
      />

      <SignalCard
        caption="Live signal"
        helper={
          metrics.engagementSignal === "unknown"
            ? "Collecting baseline signals"
            : "Face + camera + posture + audio"
        }
        icon={<Activity className="h-4 w-4" aria-hidden="true" />}
        label="Engagement"
        tone={engagementTone(metrics)}
        value={
          <span className="inline-flex items-center gap-2">
            <Gauge className="h-5 w-5" aria-hidden="true" />
            {engagementLabel(metrics)}
          </span>
        }
        delay={0.18}
      />
    </div>
  );
}

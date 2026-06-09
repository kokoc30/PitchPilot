/**
 * PracticeSessionHeader
 *
 * Top section of the practice dashboard.
 * Shows session lifecycle state, elapsed timer, and mode selector.
 * Connection and device signal chips are NOT shown here during normal
 * healthy operation — only a compact warning when there is an issue.
 */

import { motion } from "framer-motion";
import {
  AlertTriangle,
  CircleDot,
  Sparkles,
  Timer,
} from "lucide-react";
import type { PracticeMode } from "../../app/store";
import { formatDuration } from "../../lib/metrics";
import { cn } from "../../lib/utils";

export type SessionLifecycle =
  | "idle"
  | "preparing"
  | "live"
  | "paused"
  | "ended";

export type PracticeModeOption = {
  value: PracticeMode;
  label: string;
  description: string;
};

export const PRACTICE_MODE_OPTIONS: PracticeModeOption[] = [
  {
    value: "interview",
    label: "Interview",
    description: "Behavioral & technical rehearsals.",
  },
  {
    value: "pitch",
    label: "Startup Pitch",
    description: "Investor-style storytelling.",
  },
  {
    value: "presentation",
    label: "Presentation",
    description: "Conference or class-talk delivery.",
  },
  {
    value: "elevator",
    label: "Elevator Pitch",
    description: "30–60 second introductions.",
  },
  {
    value: "custom",
    label: "Custom Prompt",
    description: "Use your own prompt or freestyle.",
  },
];

type PracticeSessionHeaderProps = {
  mode: PracticeMode;
  onSelectMode: (mode: PracticeMode) => void;
  sessionLifecycle: SessionLifecycle;
  elapsedSeconds: number;
  /** Show a compact connection warning strip when the realtime backend is unreachable. */
  hasConnectionIssue?: boolean;
};

function lifecycleStyle(status: SessionLifecycle) {
  switch (status) {
    case "live":
      return {
        ring: "ring-emerald-400/40 shadow-[0_0_36px_rgba(16,185,129,0.18)]",
        dot: "bg-emerald-400",
        label: "Live session",
        sub: "Streaming · metrics updating",
      };
    case "preparing":
      return {
        ring: "ring-amber-400/35",
        dot: "bg-amber-300",
        label: "Preparing",
        sub: "Accept any browser permission prompts.",
      };
    case "paused":
      return {
        ring: "ring-amber-400/30",
        dot: "bg-amber-400",
        label: "Paused",
        sub: "Resume to keep collecting metrics.",
      };
    case "ended":
      return {
        ring: "ring-cyan-400/30",
        dot: "bg-cyan-300",
        label: "Session ended",
        sub: "Review your metrics or reset for a new run.",
      };
    default:
      return {
        ring: "ring-zinc-700",
        dot: "bg-zinc-500",
        label: "Practice",
        sub: "Choose a mode, start camera and mic, then answer the prompt.",
      };
  }
}

export function PracticeSessionHeader({
  mode,
  onSelectMode,
  sessionLifecycle,
  elapsedSeconds,
  hasConnectionIssue = false,
}: PracticeSessionHeaderProps) {
  const lifecycle = lifecycleStyle(sessionLifecycle);

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/95 to-zinc-900/80 p-5 shadow-panel"
      initial={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        {/* Left: lifecycle + label */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-900/80 ring-1",
              lifecycle.ring,
            )}
          >
            <Sparkles className="h-6 w-6 text-cyan-300" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CircleDot
                aria-hidden="true"
                className={cn("h-3 w-3 rounded-full", lifecycle.dot)}
              />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                PitchPilot AI
              </p>
            </div>
            <h1 className="mt-1.5 text-2xl font-semibold text-white sm:text-3xl">
              {lifecycle.label}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">{lifecycle.sub}</p>
          </div>
        </div>

        {/* Right: elapsed timer (+ compact connection warning) */}
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
            <Timer className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              Elapsed
            </span>
            <span className="ml-1 font-mono text-base font-semibold tabular-nums text-white">
              {formatDuration(elapsedSeconds)}
            </span>
          </div>

          {hasConnectionIssue && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              Realtime connection issue
            </span>
          )}
        </div>
      </div>

      {/* Mode selector */}
      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
          Practice mode
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {PRACTICE_MODE_OPTIONS.map((option) => {
            const active = option.value === mode;
            return (
              <button
                aria-pressed={active}
                className={cn(
                  "flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                  active
                    ? "border-cyan-300/50 bg-cyan-300/[0.08] text-cyan-100 shadow-[0_0_22px_rgba(45,212,191,0.16)]"
                    : "border-zinc-800 bg-zinc-900/55 text-zinc-300 hover:border-zinc-600 hover:text-white",
                )}
                key={option.value}
                onClick={() => onSelectMode(option.value)}
                type="button"
              >
                <span className="text-sm font-semibold leading-none">
                  {option.label}
                </span>
                <span className="text-[11px] leading-4 text-zinc-500">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

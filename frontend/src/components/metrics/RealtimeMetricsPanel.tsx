/**
 * RealtimeMetricsPanel.tsx
 *
 * Displays the live realtime metrics computed by useRealtimeMetrics.
 * Replaces the placeholder Realtime metrics card from Task 7.
 */

import {
  Activity,
  Eye,
  MessageSquareText,
  Mic,
  PersonStanding,
  RefreshCcw,
  Timer,
  TrendingUp,
} from "lucide-react";
import type { RealtimeMetrics } from "../../hooks/useRealtimeMetrics";
import type { MetricCardStatus } from "./MetricCard";
import { MetricCard } from "./MetricCard";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { formatDuration } from "../../lib/metrics";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function paceStatusStyle(pace: RealtimeMetrics["paceStatus"]): MetricCardStatus {
  switch (pace) {
    case "good":
      return "good";
    case "too_slow":
      return "warning";
    case "too_fast":
      return "bad";
    default:
      return "muted";
  }
}

function paceLabel(pace: RealtimeMetrics["paceStatus"]): string {
  switch (pace) {
    case "good":
      return "Good pace";
    case "too_slow":
      return "Too slow";
    case "too_fast":
      return "Too fast";
    default:
      return "Warming up...";
  }
}

function engagementStyle(e: RealtimeMetrics["engagementSignal"]): MetricCardStatus {
  switch (e) {
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

function metricsStatusTone(
  s: RealtimeMetrics["metricsStatus"],
): "online" | "pending" | "offline" | "warning" {
  switch (s) {
    case "active":
      return "online";
    case "warming_up":
      return "pending";
    case "paused":
    case "ready":
      return "warning";
    default:
      return "offline";
  }
}

function metricsStatusLabel(s: RealtimeMetrics["metricsStatus"]): string {
  switch (s) {
    case "idle":
      return "idle";
    case "warming_up":
      return "warming up";
    case "active":
      return "live";
    case "paused":
      return "paused";
    case "ready":
      return "session ended";
  }
}

function postureLabel(p: RealtimeMetrics["postureSignal"]): string {
  switch (p) {
    case "upright":
      return "Upright";
    case "leaning":
      return "Leaning";
    case "not_detected":
      return "Not detected";
    default:
      return "Waiting";
  }
}

function postureStyle(p: RealtimeMetrics["postureSignal"]): MetricCardStatus {
  switch (p) {
    case "upright":
      return "good";
    case "leaning":
      return "warning";
    case "not_detected":
      return "muted";
    default:
      return "muted";
  }
}

function fillerRateStyle(rate: number): MetricCardStatus {
  if (rate <= 5) return "good";
  if (rate <= 12) return "warning";
  return "bad";
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Props = {
  metrics: RealtimeMetrics;
  onReset: () => void;
};

export function RealtimeMetricsPanel({ metrics, onReset }: Props) {
  const {
    metricsStatus,
    elapsedSeconds,
    wordCount,
    wordsPerMinute,
    paceStatus,
    fillerWordCount,
    fillerRate,
    topFillers,
    pauseCount,
    currentPauseSeconds,
    longestPauseSeconds,
    faceVisiblePercent,
    cameraFacingPercent,
    postureSignal,
    engagementSignal,
  } = metrics;

  const isIdle = metricsStatus === "idle";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line-2 bg-bg-2 p-5 shadow-panel">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-300" aria-hidden="true" />
          <h2 className="text-base font-semibold text-white">Realtime metrics</h2>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge
            label={metricsStatusLabel(metricsStatus)}
            tone={metricsStatusTone(metricsStatus)}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={onReset}
            title="Reset metrics"
            aria-label="Reset all metrics"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Idle state */}
      {isIdle && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-center">
          <Activity className="h-8 w-8 text-zinc-600" aria-hidden="true" />
          <p className="text-sm text-zinc-400">
            Start the microphone and begin streaming to see live metrics.
          </p>
        </div>
      )}

      {/* Metrics grid */}
      {!isIdle && (
        <>
          {/* Section: session */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <MetricCard
              label="Elapsed"
              value={formatDuration(elapsedSeconds)}
              helper="hh:mm:ss"
              icon={<Timer className="h-3.5 w-3.5" />}
            />
            <MetricCard
              label="Words spoken"
              value={wordCount > 0 ? wordCount.toString() : "0"}
              helper="final + interim"
              icon={<MessageSquareText className="h-3.5 w-3.5" />}
            />
            <MetricCard
              label="Words / min"
              value={
                paceStatus === "unknown" ? "0" : wordsPerMinute.toString()
              }
              helper={paceStatus === "unknown" ? "warming up" : paceLabel(paceStatus)}
              status={paceStatusStyle(paceStatus)}
              icon={<TrendingUp className="h-3.5 w-3.5" />}
            />
          </div>

          {/* Section: speech quality */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricCard
              label="Filler words"
              value={fillerWordCount > 0 ? fillerWordCount.toString() : "0"}
              helper={`${fillerRate}% of words`}
              status={
                fillerWordCount === 0
                  ? "muted"
                  : fillerRateStyle(fillerRate)
              }
              icon={<Mic className="h-3.5 w-3.5" />}
            />
            <MetricCard
              label="Filler rate"
              value={wordCount > 0 ? `${fillerRate}%` : "0%"}
              helper="estimate"
              status={wordCount > 0 ? fillerRateStyle(fillerRate) : "muted"}
            />
            <MetricCard
              label="Pauses"
              value={pauseCount.toString()}
              helper={
                longestPauseSeconds > 0
                  ? `longest ${longestPauseSeconds.toFixed(1)}s`
                  : ">= 1.5s silence"
              }
              status={pauseCount === 0 ? "muted" : "neutral"}
            />
            <MetricCard
              label="Current pause"
              value={
                currentPauseSeconds > 0
                  ? `${currentPauseSeconds.toFixed(1)}s`
                  : "0s"
              }
              helper="active silence"
              status={currentPauseSeconds > 0 ? "warning" : "muted"}
            />
          </div>

          {/* Top fillers */}
          {topFillers.length > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Top filler words
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {topFillers.map(({ word, count }) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1 rounded-full border border-orange-400/30 bg-orange-400/10 px-2.5 py-0.5 text-xs font-medium text-orange-200"
                  >
                    &ldquo;{word}&rdquo;
                    <span className="rounded-full bg-orange-400/20 px-1 text-orange-100">
                      {count}×
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section: visual delivery */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <MetricCard
              label="Face visible"
              value={`${faceVisiblePercent}%`}
              helper="of session ticks"
              status={
                faceVisiblePercent >= 80
                  ? "good"
                  : faceVisiblePercent >= 50
                    ? "warning"
                    : faceVisiblePercent > 0
                      ? "bad"
                      : "muted"
              }
              icon={<Eye className="h-3.5 w-3.5" />}
            />
            <MetricCard
              label="Camera-facing"
              value={`${cameraFacingPercent}%`}
              helper="center / good estimate"
              status={
                cameraFacingPercent >= 75
                  ? "good"
                  : cameraFacingPercent >= 50
                    ? "warning"
                    : cameraFacingPercent > 0
                      ? "bad"
                      : "muted"
              }
              icon={<Eye className="h-3.5 w-3.5" />}
            />
            <MetricCard
              label="Posture"
              value={postureLabel(postureSignal)}
              helper="MediaPipe estimate"
              status={postureStyle(postureSignal)}
              icon={<PersonStanding className="h-3.5 w-3.5" />}
            />
          </div>

          {/* Engagement signal */}
          <MetricCard
            label="Engagement signal"
            value={
              engagementSignal === "unknown"
                ? "Warming up..."
                : engagementSignal.charAt(0).toUpperCase() +
                  engagementSignal.slice(1)
            }
            helper="Face + camera + posture + audio. Not a final score."
            status={engagementStyle(engagementSignal)}
            className="col-span-full"
          />
        </>
      )}

      {/* Footer note */}
      <p className="text-xs text-zinc-600">
        Metrics are local estimates computed in-browser. No data is sent to any
        external service.
      </p>
    </div>
  );
}

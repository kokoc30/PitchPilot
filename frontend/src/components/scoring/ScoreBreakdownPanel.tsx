import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Eye,
  Gauge,
  MessageSquareText,
  PersonStanding,
  TimerReset,
} from "lucide-react";
import type { ScoreSnapshot, ScoreStatus } from "../../lib/scoring";
import { cn } from "../../lib/utils";
import { StatusBadge } from "../ui/StatusBadge";
import { ScoreCard } from "./ScoreCard";
import { ScoreReasonList } from "./ScoreReasonList";

type ScoreBreakdownPanelProps = {
  snapshot: ScoreSnapshot;
  lastUpdatedAt: number | null;
};

export function ScoreBreakdownPanel({
  snapshot,
  lastUpdatedAt,
}: ScoreBreakdownPanelProps) {
  const { status, label, breakdown } = snapshot;
  const isReady = status === "ready" || status === "limited_data";
  const overallScore = isReady ? breakdown.overall : 0;

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800 bg-zinc-950/72 p-5 shadow-panel"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/20">
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                Communication score
              </h2>
              <StatusBadge
                label={statusLabel(status)}
                tone={statusTone(status)}
              />
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Your score will update as you speak.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <TimerReset className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{lastUpdatedAt ? `Updated ${formatTime(lastUpdatedAt)}` : "Waiting for signal"}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-4">
          <div className="flex flex-col items-center text-center">
            <OverallScoreRing score={overallScore} status={status} />
            <p className="mt-4 text-lg font-semibold text-white">{label}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Overall uses clarity 30%, pace 20%, delivery 20%, engagement 15%,
              and camera-facing 15%.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <MetricSnapshot
              label="Words"
              value={snapshot.metricsSummary.wordCount.toString()}
            />
            <MetricSnapshot
              label="WPM"
              value={
                snapshot.metricsSummary.wordsPerMinute > 0
                  ? snapshot.metricsSummary.wordsPerMinute.toString()
                  : "0"
              }
            />
            <MetricSnapshot
              label="Fillers"
              value={`${snapshot.metricsSummary.fillerRate}%`}
            />
            <MetricSnapshot
              label="Camera"
              value={`${snapshot.metricsSummary.cameraFacingPercent}%`}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ScoreCard
            helperText="Fillers and pause flow"
            icon={<MessageSquareText className="h-3.5 w-3.5" />}
            label="Clarity"
            score={breakdown.clarity}
            status={status}
          />
          <ScoreCard
            helperText="Target 110-170 wpm"
            icon={<Gauge className="h-3.5 w-3.5" />}
            label="Pace"
            score={breakdown.pace}
            status={status}
          />
          <ScoreCard
            helperText="Posture and pauses"
            icon={<PersonStanding className="h-3.5 w-3.5" />}
            label="Delivery"
            score={breakdown.delivery}
            status={status}
          />
          <ScoreCard
            helperText="Face, posture, audio"
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Engagement"
            score={breakdown.engagement}
            status={status}
          />
          <ScoreCard
            className="sm:col-span-2 xl:col-span-2"
            helperText="Camera-facing and face visibility"
            icon={<Eye className="h-3.5 w-3.5" />}
            label="Camera-facing"
            score={breakdown.eyeContact}
            status={status}
          />
        </div>
      </div>

      <div className="mt-4">
        <ScoreReasonList
          improvementHints={snapshot.improvementHints}
          reasons={snapshot.reasons}
          status={status}
        />
      </div>
    </motion.section>
  );
}

function OverallScoreRing({
  score,
  status,
}: {
  score: number;
  status: ScoreStatus;
}) {
  const isReady = status === "ready" || status === "limited_data";
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const ringColor = ringColorForScore(safeScore, status);

  return (
    <div
      aria-label="Overall communication score"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={isReady ? safeScore : 0}
      className="h-32 w-32 rounded-full p-1"
      role="meter"
      style={{
        background: `conic-gradient(${ringColor} ${
          isReady ? safeScore : 0
        }%, rgba(39,39,42,0.9) 0)`,
      }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-zinc-800 bg-zinc-950">
        <span
          className={cn(
            "text-4xl font-semibold leading-none",
            isReady ? "text-white" : "text-zinc-500",
          )}
        >
          {isReady ? safeScore : "0"}
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {isReady ? "score" : "waiting"}
        </span>
      </div>
    </div>
  );
}

function MetricSnapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 font-semibold text-zinc-200">{value}</p>
    </div>
  );
}

function statusLabel(status: ScoreStatus): string {
  switch (status) {
    case "ready":
      return "ready";
    case "limited_data":
      return "limited data";
    case "warming_up":
      return "warming up";
    case "insufficient_data":
      return "waiting for signal";
  }
}

function statusTone(status: ScoreStatus): "online" | "pending" | "offline" {
  switch (status) {
    case "ready":
      return "online";
    case "limited_data":
      return "pending";
    case "warming_up":
      return "pending";
    case "insufficient_data":
      return "offline";
  }
}

function ringColorForScore(score: number, status: ScoreStatus): string {
  if (status !== "ready" && status !== "limited_data") return "rgba(113,113,122,0.7)";
  if (score >= 90) return "rgba(110,231,183,0.95)";
  if (score >= 75) return "rgba(129, 140, 248,0.95)";
  if (score >= 60) return "rgba(252,211,77,0.95)";
  return "rgba(253,164,175,0.95)";
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

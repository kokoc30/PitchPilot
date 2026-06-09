import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  BarChart3,
  Camera,
  Eraser,
  Gauge,
  GitCompareArrows,
  MessageSquareText,
  PauseCircle,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import type {
  AttemptSnapshot,
  DeltaClassification,
  RetryComparison,
} from "../../lib/comparison";
import { classifyDelta, formatDelta } from "../../lib/comparison";
import type { RetryComparisonStatus } from "../../hooks/useRetryComparison";
import { formatDuration } from "../../lib/metrics";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { ComparisonMetricCard } from "./ComparisonMetricCard";
import { TranscriptComparison } from "./TranscriptComparison";

type RetryComparisonPanelProps = {
  baselineAttempt: AttemptSnapshot | null;
  retryAttempt: AttemptSnapshot | null;
  comparison: RetryComparison | null;
  status: RetryComparisonStatus;
  activeAttemptLabel: "baseline" | "retry";
  canSaveCurrent: boolean;
  currentHasReport: boolean;
  onSaveBaseline: () => void;
  onStartRetry: () => void;
  onSaveRetry: () => void;
  onClearComparison: () => void;
};

export function RetryComparisonPanel({
  baselineAttempt,
  retryAttempt,
  comparison,
  status,
  activeAttemptLabel,
  canSaveCurrent,
  currentHasReport,
  onSaveBaseline,
  onStartRetry,
  onSaveRetry,
  onClearComparison,
}: RetryComparisonPanelProps) {
  const hasBaseline = Boolean(baselineAttempt);
  const hasRetry = Boolean(retryAttempt);

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800 bg-zinc-950/72 p-5 shadow-panel"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/20">
            <GitCompareArrows className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                Retry comparison
              </h2>
              <StatusBadge label={statusLabel(status)} tone={statusTone(status)} />
              <StatusBadge label="local only" tone="offline" />
              {currentHasReport && (
                <StatusBadge label="report available" tone="online" />
              )}
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">
              Save a baseline, reset for a second take, then compare scores,
              pace, fillers, pauses, camera-facing, transcript length, and any
              report summaries already generated in this browser session.
            </p>
            <p className="mt-1 text-[11px] text-zinc-600">
              Active slot: {activeAttemptLabel}. Data stays in local
              sessionStorage and is not written to Supabase.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!canSaveCurrent}
            icon={<Save className="h-4 w-4" aria-hidden="true" />}
            onClick={onSaveBaseline}
            size="sm"
            variant={hasBaseline ? "secondary" : "primary"}
          >
            Save current as baseline
          </Button>
          <Button
            disabled={!hasBaseline}
            icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
            onClick={onStartRetry}
            size="sm"
            variant="secondary"
            title="Stops audio streaming if active, then clears transcript, metrics, score, and report while leaving camera and microphone permissions active."
          >
            Start retry
          </Button>
          <Button
            disabled={!hasBaseline || !canSaveCurrent}
            icon={<GitCompareArrows className="h-4 w-4" aria-hidden="true" />}
            onClick={onSaveRetry}
            size="sm"
            variant={hasRetry ? "secondary" : "primary"}
          >
            Save current as retry
          </Button>
          <Button
            disabled={!hasBaseline && !hasRetry}
            icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            onClick={onClearComparison}
            size="sm"
            variant="ghost"
          >
            Clear comparison
          </Button>
        </div>
      </div>

      {!hasBaseline && (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/45 p-6 text-center">
          <Eraser className="h-8 w-8 text-zinc-600" aria-hidden="true" />
          <p className="text-sm text-zinc-300">
            Complete a practice attempt, then save it as baseline.
          </p>
          <p className="max-w-xl text-xs leading-5 text-zinc-500">
            The panel will use the current transcript, realtime metrics,
            deterministic score snapshot, and current AI report if one exists.
          </p>
        </div>
      )}

      {hasBaseline && (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <AttemptSummaryCard
            attempt={baselineAttempt}
            emptyText="No baseline saved yet."
            label="Baseline"
          />
          <AttemptSummaryCard
            attempt={retryAttempt}
            emptyText="Start retry, run a second attempt, then save it here."
            label="Retry"
          />
        </div>
      )}

      {hasBaseline && !hasRetry && (
        <div className="mt-4 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.05] p-4">
          <p className="text-sm leading-6 text-cyan-100">
            Baseline saved. Click Start retry to clear live practice state, run
            your second attempt, then save it as the retry.
          </p>
        </div>
      )}

      {comparison && baselineAttempt && retryAttempt && (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-white">
                  Comparison summary
                </h3>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-semibold",
                  outcomeBadgeClass(classifyDelta("overallScore", comparison.scoreDelta)),
                )}
              >
                {outcomeLabel(classifyDelta("overallScore", comparison.scoreDelta))}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-200">
              {comparison.summary}
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <ComparisonMetricCard
              baselineValue={scoreValue(baselineAttempt)}
              classification={classifyDelta("overallScore", comparison.scoreDelta)}
              deltaLabel={formatDelta(comparison.scoreDelta, "pts")}
              helper="Higher score means the retry improved overall."
              icon={<BarChart3 className="h-4 w-4" />}
              label="Overall score"
              retryValue={scoreValue(retryAttempt)}
            />
            <ComparisonMetricCard
              baselineValue={`${baselineAttempt.wordsPerMinute} wpm`}
              classification={classifyDelta(
                "wpmTargetDistance",
                comparison.wpmTargetDistanceDelta,
              )}
              deltaLabel={formatDelta(comparison.wpmDelta, "wpm")}
              helper="Improves by moving closer to 110-170 wpm."
              icon={<Gauge className="h-4 w-4" />}
              label="Pace"
              retryValue={`${retryAttempt.wordsPerMinute} wpm`}
            />
            <ComparisonMetricCard
              baselineValue={`${baselineAttempt.fillerWordCount}`}
              classification={classifyDelta("fillerCount", comparison.fillerDelta)}
              deltaLabel={formatDelta(comparison.fillerDelta)}
              helper="Lower filler count is better."
              icon={<MessageSquareText className="h-4 w-4" />}
              label="Filler words"
              retryValue={`${retryAttempt.fillerWordCount}`}
            />
            <ComparisonMetricCard
              baselineValue={`${baselineAttempt.fillerRate}%`}
              classification={classifyDelta(
                "fillerRate",
                comparison.fillerRateDelta,
              )}
              deltaLabel={formatDelta(comparison.fillerRateDelta, "%")}
              helper="Lower filler rate is better."
              label="Filler rate"
              retryValue={`${retryAttempt.fillerRate}%`}
            />
            <ComparisonMetricCard
              baselineValue={`${baselineAttempt.pauseCount}`}
              classification={classifyDelta("pauseCount", comparison.pauseDelta)}
              deltaLabel={formatDelta(comparison.pauseDelta)}
              helper="Lower pause count is better."
              icon={<PauseCircle className="h-4 w-4" />}
              label="Pauses"
              retryValue={`${retryAttempt.pauseCount}`}
            />
            <ComparisonMetricCard
              baselineValue={`${baselineAttempt.cameraFacingPercent}%`}
              classification={classifyDelta(
                "cameraFacingPercent",
                comparison.cameraFacingDelta,
              )}
              deltaLabel={formatDelta(comparison.cameraFacingDelta, "%")}
              helper="Higher camera-facing percentage is better."
              icon={<Camera className="h-4 w-4" />}
              label="Camera-facing"
              retryValue={`${retryAttempt.cameraFacingPercent}%`}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <ScoreDeltaPill
              classification={classifyDelta(
                "clarityScore",
                comparison.categoryScoreDeltas.clarity,
              )}
              label="Clarity"
              value={formatDelta(comparison.categoryScoreDeltas.clarity, "pts")}
            />
            <ScoreDeltaPill
              classification={classifyDelta(
                "paceScore",
                comparison.categoryScoreDeltas.pace,
              )}
              label="Pace score"
              value={formatDelta(comparison.categoryScoreDeltas.pace, "pts")}
            />
            <ScoreDeltaPill
              classification={classifyDelta(
                "deliveryScore",
                comparison.categoryScoreDeltas.delivery,
              )}
              label="Delivery"
              value={formatDelta(comparison.categoryScoreDeltas.delivery, "pts")}
            />
            <ScoreDeltaPill
              classification={classifyDelta(
                "engagementScore",
                comparison.categoryScoreDeltas.engagement,
              )}
              label="Engagement"
              value={formatDelta(comparison.categoryScoreDeltas.engagement, "pts")}
            />
            <ScoreDeltaPill
              classification={classifyDelta(
                "cameraFacingScore",
                comparison.categoryScoreDeltas.cameraFacing,
              )}
              label="Camera-facing"
              value={formatDelta(
                comparison.categoryScoreDeltas.cameraFacing,
                "pts",
              )}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ComparisonMetricCard
              baselineValue={`${baselineAttempt.longestPauseSeconds.toFixed(1)}s`}
              classification={classifyDelta(
                "longestPause",
                comparison.longestPauseDelta,
              )}
              deltaLabel={formatDelta(comparison.longestPauseDelta, "s")}
              helper="Shorter longest pause is better."
              label="Longest pause"
              retryValue={`${retryAttempt.longestPauseSeconds.toFixed(1)}s`}
            />
            <ComparisonMetricCard
              baselineValue={formatEngagement(baselineAttempt.engagementSignal)}
              classification={comparison.engagementChanged.classification}
              deltaLabel={`${formatEngagement(
                comparison.engagementChanged.from,
              )} to ${formatEngagement(comparison.engagementChanged.to)}`}
              helper="Strong is highest, then steady, low, unknown."
              label="Engagement signal"
              retryValue={formatEngagement(retryAttempt.engagementSignal)}
            />
          </div>

          <TranscriptComparison
            baseline={baselineAttempt}
            comparison={comparison}
            retry={retryAttempt}
          />

          <ReportComparison baseline={baselineAttempt} retry={retryAttempt} />

          <div className="grid gap-4 lg:grid-cols-2">
            <AreaList
              emptyText="No major gains yet. Several signals may still be steady."
              icon={<Sparkles className="h-4 w-4 text-emerald-300" />}
              items={comparison.improvedAreas}
              title="Improved areas"
              tone="improved"
            />
            <AreaList
              emptyText="No major regressions detected."
              icon={<Target className="h-4 w-4 text-amber-300" />}
              items={comparison.worsenedAreas}
              title="Areas to keep working on"
              tone="worse"
            />
          </div>
        </div>
      )}
    </motion.section>
  );
}

function AttemptSummaryCard({
  attempt,
  label,
  emptyText,
}: {
  attempt: AttemptSnapshot | null;
  label: string;
  emptyText: string;
}) {
  if (!attempt) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {label}
        </p>
        <p className="mt-3 text-sm leading-6 text-zinc-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {modeLabel(attempt.mode)} / {formatCreated(attempt.createdAt)}
          </p>
        </div>
        {attempt.coachingReportSummary && (
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-xs font-medium text-cyan-200">
            report saved
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniSnapshot label="Score" value={scoreValue(attempt)} />
        <MiniSnapshot label="Duration" value={formatDuration(attempt.durationSeconds)} />
        <MiniSnapshot label="Words" value={`${attempt.wordCount}`} />
        <MiniSnapshot label="WPM" value={`${attempt.wordsPerMinute}`} />
      </div>
    </div>
  );
}

function MiniSnapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/55 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function ScoreDeltaPill({
  label,
  value,
  classification,
}: {
  label: string;
  value: string;
  classification: DeltaClassification;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        classification === "improved"
          ? "border-emerald-400/25 bg-emerald-400/[0.05]"
          : classification === "worse"
            ? "border-amber-400/30 bg-amber-400/[0.05]"
            : "border-zinc-800 bg-zinc-900/45",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold",
          classification === "improved"
            ? "text-emerald-200"
            : classification === "worse"
              ? "text-amber-200"
              : "text-zinc-200",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ReportComparison({
  baseline,
  retry,
}: {
  baseline: AttemptSnapshot;
  retry: AttemptSnapshot;
}) {
  if (!baseline.coachingReportSummary && !retry.coachingReportSummary) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-zinc-500" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white">
            Coaching report comparison
          </h3>
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          No AI report summaries were saved with these attempts. Generate a
          report before saving an attempt to compare report focus notes.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-cyan-300" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-white">
          Coaching report comparison
        </h3>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <ReportFocusCard
          attemptLabel="Baseline focus"
          report={baseline.coachingReportSummary}
        />
        <ReportFocusCard
          attemptLabel="Retry focus"
          report={retry.coachingReportSummary}
        />
      </div>
    </div>
  );
}

function ReportFocusCard({
  attemptLabel,
  report,
}: {
  attemptLabel: string;
  report: AttemptSnapshot["coachingReportSummary"];
}) {
  if (!report) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/45 p-3">
        <p className="text-xs font-semibold text-zinc-300">{attemptLabel}</p>
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          No report was saved for this attempt.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/55 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-200">{attemptLabel}</p>
        <span className="text-[11px] text-zinc-500">
          {report.provider} / {report.confidenceLabel}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-400">
        {report.improvementAreas[0] ?? report.summary}
      </p>
      {report.strengths[0] && (
        <p className="mt-2 text-xs leading-5 text-emerald-200">
          Strength: {report.strengths[0]}
        </p>
      )}
    </div>
  );
}

function AreaList({
  title,
  items,
  emptyText,
  icon,
  tone,
}: {
  title: string;
  items: string[];
  emptyText: string;
  icon: ReactNode;
  tone: "improved" | "worse";
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-zinc-500">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.slice(0, 6).map((item) => (
            <li
              className={cn(
                "rounded-lg border px-3 py-2 text-sm leading-5",
                tone === "improved"
                  ? "border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-100"
                  : "border-amber-400/25 bg-amber-400/[0.05] text-amber-100",
              )}
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function statusLabel(status: RetryComparisonStatus): string {
  switch (status) {
    case "empty":
      return "empty";
    case "baseline_saved":
      return "baseline saved";
    case "retry_saved":
      return "retry saved";
    case "compared":
      return "compared";
  }
}

function statusTone(
  status: RetryComparisonStatus,
): "online" | "pending" | "offline" | "warning" {
  switch (status) {
    case "compared":
      return "online";
    case "baseline_saved":
    case "retry_saved":
      return "pending";
    case "empty":
      return "offline";
  }
}

function scoreValue(attempt: AttemptSnapshot): string {
  if (attempt.scoreSnapshot.status !== "ready") return "0";
  return `${attempt.scoreSnapshot.breakdown.overall}`;
}

function modeLabel(mode: AttemptSnapshot["mode"]): string {
  switch (mode) {
    case "pitch":
      return "Startup Pitch";
    case "class":
      return "Class Presentation";
    case "elevator":
      return "Elevator Pitch";
    case "interview":
      return "Interview";
    case "presentation":
      return "Presentation";
    case "custom":
      return "Custom";
  }
}

function formatCreated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "saved locally";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEngagement(signal: AttemptSnapshot["engagementSignal"]): string {
  return signal.charAt(0).toUpperCase() + signal.slice(1);
}

function outcomeLabel(classification: DeltaClassification): string {
  if (classification === "improved") return "improved";
  if (classification === "worse") return "needs more practice";
  return "steady";
}

function outcomeBadgeClass(classification: DeltaClassification): string {
  if (classification === "improved") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }
  if (classification === "worse") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  }
  return "border-zinc-700 bg-zinc-900 text-zinc-300";
}

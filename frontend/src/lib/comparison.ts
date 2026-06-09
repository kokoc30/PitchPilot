import type { PracticeMode } from "../app/store";
import type { CoachingReportOutput } from "./api";
import {
  calculateFillerRate,
  calculateWordsPerMinute,
  countFillerWords,
  countWords,
} from "./metrics";
import type { ScoreSnapshot } from "./scoring";
import type { RealtimeMetrics } from "../hooks/useRealtimeMetrics";

export type AttemptLabel = "baseline" | "retry" | string;

export type DeltaClassification = "improved" | "same" | "worse";

export type CoachingReportSummarySnapshot = {
  summary: string;
  strengths: string[];
  improvementAreas: string[];
  nextPracticeFocus: string[];
  provider: CoachingReportOutput["provider"];
  confidenceLabel: CoachingReportOutput["confidenceLabel"];
  generatedAt: string;
};

export type AttemptSnapshot = {
  id: string;
  label: AttemptLabel;
  createdAt: string;
  mode: PracticeMode;
  durationSeconds: number;
  transcript: string;
  wordCount: number;
  wordsPerMinute: number;
  fillerWordCount: number;
  fillerRate: number;
  pauseCount: number;
  longestPauseSeconds: number;
  faceVisiblePercent: number;
  cameraFacingPercent: number;
  postureSignal: RealtimeMetrics["postureSignal"];
  engagementSignal: RealtimeMetrics["engagementSignal"];
  scoreSnapshot: ScoreSnapshot;
  coachingReportSummary?: CoachingReportSummarySnapshot;
  coachingReportId?: string;
};

export type CreateAttemptSnapshotInput = {
  label: AttemptLabel;
  mode: PracticeMode;
  durationSeconds?: number;
  transcript: string;
  metrics: RealtimeMetrics;
  scoreSnapshot: ScoreSnapshot;
  coachingReport?: CoachingReportOutput | null;
  createdAt?: string;
};

export type RetryComparison = {
  baselineId: string;
  retryId: string;
  comparedAt: string;
  scoreDelta: number;
  categoryScoreDeltas: {
    clarity: number;
    pace: number;
    delivery: number;
    engagement: number;
    cameraFacing: number;
  };
  wpmDelta: number;
  wpmTargetDistanceDelta: number;
  fillerDelta: number;
  fillerRateDelta: number;
  pauseDelta: number;
  longestPauseDelta: number;
  cameraFacingDelta: number;
  faceVisibleDelta: number;
  engagementChanged: {
    from: AttemptSnapshot["engagementSignal"];
    to: AttemptSnapshot["engagementSignal"];
    delta: number;
    classification: DeltaClassification;
  };
  transcriptWordDelta: number;
  improvedAreas: string[];
  worsenedAreas: string[];
  steadyAreas: string[];
  summary: string;
};

const TARGET_WPM_MIN = 110;
const TARGET_WPM_MAX = 170;

export function createAttemptSnapshot(
  input: CreateAttemptSnapshotInput,
): AttemptSnapshot {
  const transcript = input.transcript.trim();
  const transcriptWordCount = countWords(transcript);
  const wordCount = transcriptWordCount || input.metrics.wordCount;
  const fillerFromTranscript = countFillerWords(transcript);
  const fillerWordCount =
    transcriptWordCount > 0
      ? fillerFromTranscript.total
      : input.metrics.fillerWordCount;
  const durationSeconds = roundOne(
    input.durationSeconds ?? input.metrics.elapsedSeconds,
  );
  const wordsPerMinute =
    wordCount > 0 && durationSeconds > 0
      ? calculateWordsPerMinute(wordCount, durationSeconds)
      : input.metrics.wordsPerMinute;
  const fillerRate =
    wordCount > 0
      ? calculateFillerRate(fillerWordCount, wordCount)
      : input.metrics.fillerRate;

  return {
    id: createLocalId(input.label),
    label: input.label,
    createdAt: input.createdAt ?? new Date().toISOString(),
    mode: input.mode,
    durationSeconds,
    transcript,
    wordCount,
    wordsPerMinute,
    fillerWordCount,
    fillerRate,
    pauseCount: input.metrics.pauseCount,
    longestPauseSeconds: roundOne(input.metrics.longestPauseSeconds),
    faceVisiblePercent: input.metrics.faceVisiblePercent,
    cameraFacingPercent: input.metrics.cameraFacingPercent,
    postureSignal: input.metrics.postureSignal,
    engagementSignal: input.metrics.engagementSignal,
    scoreSnapshot: cloneScoreSnapshot(input.scoreSnapshot),
    coachingReportSummary: input.coachingReport
      ? {
          summary: input.coachingReport.summary,
          strengths: [...input.coachingReport.strengths],
          improvementAreas: [...input.coachingReport.improvementAreas],
          nextPracticeFocus: [...input.coachingReport.nextPracticeFocus],
          provider: input.coachingReport.provider,
          confidenceLabel: input.coachingReport.confidenceLabel,
          generatedAt: input.coachingReport.generatedAt,
        }
      : undefined,
    coachingReportId: input.coachingReport?.reportId ?? undefined,
  };
}

export function compareAttempts(
  baseline: AttemptSnapshot,
  retry: AttemptSnapshot,
): RetryComparison {
  const scoreDelta = delta(
    baseline.scoreSnapshot.breakdown.overall,
    retry.scoreSnapshot.breakdown.overall,
  );
  const categoryScoreDeltas = {
    clarity: delta(
      baseline.scoreSnapshot.breakdown.clarity,
      retry.scoreSnapshot.breakdown.clarity,
    ),
    pace: delta(
      baseline.scoreSnapshot.breakdown.pace,
      retry.scoreSnapshot.breakdown.pace,
    ),
    delivery: delta(
      baseline.scoreSnapshot.breakdown.delivery,
      retry.scoreSnapshot.breakdown.delivery,
    ),
    engagement: delta(
      baseline.scoreSnapshot.breakdown.engagement,
      retry.scoreSnapshot.breakdown.engagement,
    ),
    cameraFacing: delta(
      baseline.scoreSnapshot.breakdown.eyeContact,
      retry.scoreSnapshot.breakdown.eyeContact,
    ),
  };

  const wpmDelta = delta(baseline.wordsPerMinute, retry.wordsPerMinute);
  const wpmTargetDistanceDelta = delta(
    distanceFromTargetWpm(baseline.wordsPerMinute),
    distanceFromTargetWpm(retry.wordsPerMinute),
  );
  const fillerDelta = delta(baseline.fillerWordCount, retry.fillerWordCount);
  const fillerRateDelta = delta(baseline.fillerRate, retry.fillerRate);
  const pauseDelta = delta(baseline.pauseCount, retry.pauseCount);
  const longestPauseDelta = delta(
    baseline.longestPauseSeconds,
    retry.longestPauseSeconds,
  );
  const cameraFacingDelta = delta(
    baseline.cameraFacingPercent,
    retry.cameraFacingPercent,
  );
  const faceVisibleDelta = delta(
    baseline.faceVisiblePercent,
    retry.faceVisiblePercent,
  );
  const transcriptWordDelta = delta(baseline.wordCount, retry.wordCount);
  const engagementDelta =
    engagementRank(retry.engagementSignal) -
    engagementRank(baseline.engagementSignal);

  const areaResults: Array<{
    label: string;
    classification: DeltaClassification;
  }> = [
    {
      label: `Overall score ${formatDelta(scoreDelta, "pts")}`,
      classification: classifyDelta("overallScore", scoreDelta),
    },
    {
      label: `Clarity score ${formatDelta(categoryScoreDeltas.clarity, "pts")}`,
      classification: classifyDelta("clarityScore", categoryScoreDeltas.clarity),
    },
    {
      label:
        wpmTargetDistanceDelta === 0
          ? "Pace stayed near the 110-170 wpm target"
          : `Pace moved ${Math.abs(wpmTargetDistanceDelta)} wpm ${
              wpmTargetDistanceDelta < 0 ? "closer to" : "farther from"
            } target`,
      classification: classifyDelta(
        "wpmTargetDistance",
        wpmTargetDistanceDelta,
      ),
    },
    {
      label: `Delivery score ${formatDelta(categoryScoreDeltas.delivery, "pts")}`,
      classification: classifyDelta(
        "deliveryScore",
        categoryScoreDeltas.delivery,
      ),
    },
    {
      label: `Engagement score ${formatDelta(
        categoryScoreDeltas.engagement,
        "pts",
      )}`,
      classification: classifyDelta(
        "engagementScore",
        categoryScoreDeltas.engagement,
      ),
    },
    {
      label: `Camera-facing score ${formatDelta(
        categoryScoreDeltas.cameraFacing,
        "pts",
      )}`,
      classification: classifyDelta(
        "cameraFacingScore",
        categoryScoreDeltas.cameraFacing,
      ),
    },
    {
      label: `Filler words ${formatDelta(fillerDelta)}`,
      classification: classifyDelta("fillerCount", fillerDelta),
    },
    {
      label: `Filler rate ${formatDelta(fillerRateDelta, "%")}`,
      classification: classifyDelta("fillerRate", fillerRateDelta),
    },
    {
      label: `Pause count ${formatDelta(pauseDelta)}`,
      classification: classifyDelta("pauseCount", pauseDelta),
    },
    {
      label: `Longest pause ${formatDelta(longestPauseDelta, "s")}`,
      classification: classifyDelta("longestPause", longestPauseDelta),
    },
    {
      label: `Camera-facing time ${formatDelta(cameraFacingDelta, "%")}`,
      classification: classifyDelta("cameraFacingPercent", cameraFacingDelta),
    },
    {
      label: `Engagement signal ${baseline.engagementSignal} to ${retry.engagementSignal}`,
      classification: classifyDelta("engagementSignal", engagementDelta),
    },
  ];

  const comparison: RetryComparison = {
    baselineId: baseline.id,
    retryId: retry.id,
    comparedAt: new Date().toISOString(),
    scoreDelta,
    categoryScoreDeltas,
    wpmDelta,
    wpmTargetDistanceDelta,
    fillerDelta,
    fillerRateDelta,
    pauseDelta,
    longestPauseDelta,
    cameraFacingDelta,
    faceVisibleDelta,
    engagementChanged: {
      from: baseline.engagementSignal,
      to: retry.engagementSignal,
      delta: engagementDelta,
      classification: classifyDelta("engagementSignal", engagementDelta),
    },
    transcriptWordDelta,
    improvedAreas: areaResults
      .filter((area) => area.classification === "improved")
      .map((area) => area.label),
    worsenedAreas: areaResults
      .filter((area) => area.classification === "worse")
      .map((area) => area.label),
    steadyAreas: areaResults
      .filter((area) => area.classification === "same")
      .map((area) => area.label),
    summary: "",
  };

  return {
    ...comparison,
    summary: buildComparisonSummary(comparison),
  };
}

export function formatDelta(value: number, unit?: string): string {
  const rounded = roundOne(value);
  const sign = rounded > 0 ? "+" : "";
  const unitLabel = unit ? (unit === "%" ? "%" : ` ${unit}`) : "";
  return `${sign}${formatNumber(rounded)}${unitLabel}`;
}

export function classifyDelta(
  metricName: string,
  deltaValue: number,
): DeltaClassification {
  const metric = metricName.toLowerCase();
  const threshold = thresholdForMetric(metric);

  if (Math.abs(deltaValue) <= threshold) return "same";
  if (isNeutralMetric(metric)) return "same";

  if (isLowerBetterMetric(metric)) {
    return deltaValue < 0 ? "improved" : "worse";
  }

  return deltaValue > 0 ? "improved" : "worse";
}

export function buildComparisonSummary(comparison: RetryComparison): string {
  const scoreClass = classifyDelta("overallScore", comparison.scoreDelta);
  const scoreDeltaText = formatDelta(comparison.scoreDelta, "pts");
  const primaryGain = comparison.improvedAreas[0];
  const primaryFocus = comparison.worsenedAreas[0];

  if (scoreClass === "improved") {
    return `Retry improved overall by ${scoreDeltaText}. ${
      primaryGain
        ? `Biggest gain: ${primaryGain}.`
        : "Most tracked signals held steady."
    }`;
  }

  if (scoreClass === "worse") {
    return `Retry needs more practice overall (${scoreDeltaText}). ${
      primaryFocus
        ? `Keep working on: ${primaryFocus}.`
        : "The main tracked signals were close to baseline."
    }`;
  }

  if (primaryGain && primaryFocus) {
    return `Overall score stayed steady. Improved: ${primaryGain}. Keep working on: ${primaryFocus}.`;
  }

  if (primaryGain) {
    return `Overall score stayed steady, with progress in ${primaryGain}.`;
  }

  return "Overall score stayed steady. The retry is close to the baseline across the tracked signals.";
}

function createLocalId(label: AttemptLabel): string {
  const prefix = String(label || "attempt").replace(/[^a-z0-9_-]/gi, "-");
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneScoreSnapshot(snapshot: ScoreSnapshot): ScoreSnapshot {
  return {
    ...snapshot,
    breakdown: { ...snapshot.breakdown },
    reasons: snapshot.reasons.map((reason) => ({ ...reason })),
    improvementHints: [...snapshot.improvementHints],
    metricsSummary: { ...snapshot.metricsSummary },
  };
}

function delta(baselineValue: number, retryValue: number): number {
  return roundOne(retryValue - baselineValue);
}

function roundOne(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10) / 10;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function distanceFromTargetWpm(wpm: number): number {
  if (wpm >= TARGET_WPM_MIN && wpm <= TARGET_WPM_MAX) return 0;
  if (wpm < TARGET_WPM_MIN) return TARGET_WPM_MIN - wpm;
  return wpm - TARGET_WPM_MAX;
}

function thresholdForMetric(metric: string): number {
  if (metric.includes("score")) return 2;
  if (metric.includes("percent") || metric.includes("rate")) return 1;
  if (metric.includes("longest")) return 0.5;
  if (metric.includes("wpmtargetdistance")) return 5;
  if (metric.includes("signal")) return 0;
  return 0.5;
}

function isLowerBetterMetric(metric: string): boolean {
  return (
    metric.includes("filler") ||
    metric.includes("pause") ||
    metric.includes("longest") ||
    metric.includes("wpmtargetdistance")
  );
}

function isNeutralMetric(metric: string): boolean {
  return metric.includes("transcript") || metric.includes("wordcount");
}

function engagementRank(signal: RealtimeMetrics["engagementSignal"]): number {
  switch (signal) {
    case "strong":
      return 3;
    case "steady":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

import type { RealtimeMetrics } from "../hooks/useRealtimeMetrics";

export type ScoreStatus = "insufficient_data" | "warming_up" | "ready" | "limited_data";

export type ScoreLabel =
  | "Excellent"
  | "Strong"
  | "Developing"
  | "Needs focus"
  | "Incomplete";

export type ScoreReasonType = "strength" | "improvement" | "warning";

export type ScoreCategory =
  | "clarity"
  | "pace"
  | "delivery"
  | "engagement"
  | "camera_facing"
  | "overall";

export type ScoreBreakdown = {
  clarity: number;
  pace: number;
  delivery: number;
  engagement: number;
  eyeContact: number;
  overall: number;
};

export type ScoreReason = {
  category: ScoreCategory;
  type: ScoreReasonType;
  message: string;
};

export type ScoreSnapshot = {
  status: ScoreStatus;
  label: ScoreLabel;
  breakdown: ScoreBreakdown;
  reasons: ScoreReason[];
  improvementHints: string[];
  generatedAt: number;
  metricsSummary: {
    elapsedSeconds: number;
    wordCount: number;
    wordsPerMinute: number;
    fillerRate: number;
    pauseCount: number;
    faceVisiblePercent: number;
    cameraFacingPercent: number;
  };
};

type WeightedScoreInput = Pick<
  ScoreBreakdown,
  "clarity" | "pace" | "delivery" | "engagement" | "eyeContact"
>;

const MIN_READY_SECONDS = 10;
const MIN_READY_WORDS = 3;
const PACE_MIN_WPM = 110;
const PACE_MAX_WPM = 170;

export const SCORE_WEIGHTS = {
  clarity: 0.3,
  pace: 0.2,
  delivery: 0.2,
  engagement: 0.15,
  eyeContact: 0.15,
} as const;

export const EMPTY_SCORE_BREAKDOWN: ScoreBreakdown = {
  clarity: 0,
  pace: 0,
  delivery: 0,
  engagement: 0,
  eyeContact: 0,
  overall: 0,
};

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function labelScore(
  score: number,
  status: ScoreStatus = "ready",
): ScoreLabel {
  if (status !== "ready" && status !== "limited_data") return "Incomplete";
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Developing";
  if (score >= 40) return "Needs focus";
  return "Incomplete";
}

export function calculatePaceScore(metrics: RealtimeMetrics): number {
  if (
    metrics.elapsedSeconds <= 0 ||
    metrics.wordCount < MIN_READY_WORDS ||
    metrics.wordsPerMinute <= 0
  ) {
    return 0;
  }

  if (
    metrics.wordsPerMinute >= PACE_MIN_WPM &&
    metrics.wordsPerMinute <= PACE_MAX_WPM
  ) {
    return 96;
  }

  if (metrics.wordsPerMinute < PACE_MIN_WPM) {
    return clampScore(96 - (PACE_MIN_WPM - metrics.wordsPerMinute) * 0.9);
  }

  return clampScore(96 - (metrics.wordsPerMinute - PACE_MAX_WPM) * 1.15);
}

export function calculateClarityScore(metrics: RealtimeMetrics): number {
  if (metrics.wordCount < MIN_READY_WORDS) return 0;

  let score = 96;
  const pauseRate = pausesPerMinute(metrics);

  if (metrics.fillerRate > 3) {
    score -= (metrics.fillerRate - 3) * 4.2;
  } else if (metrics.fillerRate === 0 && metrics.wordCount >= 20) {
    score += 2;
  }

  if (pauseRate > 4) {
    score -= Math.min(28, (pauseRate - 4) * 6);
  }

  if (metrics.longestPauseSeconds > 5) {
    score -= Math.min(18, (metrics.longestPauseSeconds - 5) * 3.5);
  }

  if (metrics.wordCount < 20) {
    score -= (20 - metrics.wordCount) * 0.7;
  }

  return clampScore(score);
}

export function calculateDeliveryScore(metrics: RealtimeMetrics): number {
  const postureScore = postureToScore(metrics.postureSignal);
  const faceScore = percentToScore(metrics.faceVisiblePercent, 35);
  const speakingScore = speakingActivityScore(metrics);
  const pauseScore = pauseBehaviorScore(metrics);

  return clampScore(
    postureScore * 0.3 +
      faceScore * 0.25 +
      speakingScore * 0.25 +
      pauseScore * 0.2,
  );
}

export function calculateEngagementScore(metrics: RealtimeMetrics): number {
  const signalScore = engagementSignalToScore(metrics.engagementSignal);
  const faceScore = percentToScore(metrics.faceVisiblePercent, 35);
  const cameraScore = percentToScore(metrics.cameraFacingPercent, 30);
  const audioScore = speakingActivityScore(metrics);

  return clampScore(
    signalScore * 0.35 +
      faceScore * 0.25 +
      cameraScore * 0.25 +
      audioScore * 0.15,
  );
}

export function calculateEyeContactScore(metrics: RealtimeMetrics): number {
  if (metrics.faceVisiblePercent <= 0 && metrics.cameraFacingPercent <= 0) {
    return 0;
  }

  return clampScore(
    metrics.cameraFacingPercent * 0.75 + metrics.faceVisiblePercent * 0.25,
  );
}

export function calculateOverallScore(breakdown: WeightedScoreInput): number {
  return clampScore(
    breakdown.clarity * SCORE_WEIGHTS.clarity +
      breakdown.pace * SCORE_WEIGHTS.pace +
      breakdown.delivery * SCORE_WEIGHTS.delivery +
      breakdown.engagement * SCORE_WEIGHTS.engagement +
      breakdown.eyeContact * SCORE_WEIGHTS.eyeContact,
  );
}

export type CalculateScoreOptions = {
  mode?: "live" | "final";
};

export function getScoreReasons(
  metrics: RealtimeMetrics,
  breakdown: ScoreBreakdown,
  options?: CalculateScoreOptions,
): ScoreReason[] {
  const status = getScoreStatus(metrics, options);

  if (status === "insufficient_data") {
    return [
      {
        category: "overall",
        type: "warning",
        message:
          "Start practice signals before scoring. The engine needs transcript, audio, or camera data.",
      },
    ];
  }

  if (status === "warming_up") {
    return [
      {
        category: "overall",
        type: "warning",
        message:
          "Scoring starts after about 10 seconds and at least 3 transcript words.",
      },
    ];
  }

  const reasons: ScoreReason[] = [];

  if (status === "limited_data") {
    reasons.push({
      category: "overall",
      type: "warning",
      message:
        "Score calculated with limited practice time. Speak longer for more robust results.",
    });
  }

  if (breakdown.clarity >= 80) {
    reasons.push({
      category: "clarity",
      type: "strength",
      message: "Filler words and long pauses are staying controlled.",
    });
  } else {
    reasons.push({
      category: "clarity",
      type: "improvement",
      message:
        metrics.fillerRate > 8
          ? "Filler words are pulling down the clarity estimate."
          : "More concise pauses would improve the clarity estimate.",
    });
  }

  if (metrics.paceStatus === "good") {
    reasons.push({
      category: "pace",
      type: "strength",
      message: "Speaking pace is within the 110-170 words per minute target.",
    });
  } else {
    reasons.push({
      category: "pace",
      type: "improvement",
      message:
        metrics.paceStatus === "too_fast"
          ? "The current pace is above the target range."
          : "The current pace is below the target range.",
    });
  }

  if (metrics.postureSignal === "upright" && breakdown.delivery >= 75) {
    reasons.push({
      category: "delivery",
      type: "strength",
      message: "Posture and speaking activity support steady delivery.",
    });
  } else if (breakdown.delivery < 75) {
    reasons.push({
      category: "delivery",
      type: "improvement",
      message:
        "Delivery is affected by posture, face visibility, or pause behavior.",
    });
  }

  if (breakdown.engagement >= 75) {
    reasons.push({
      category: "engagement",
      type: "strength",
      message: "Face, camera-facing, posture, and audio signals look engaged.",
    });
  } else {
    reasons.push({
      category: "engagement",
      type: "improvement",
      message:
        "Engagement improves when your face stays visible and speech remains active.",
    });
  }

  if (metrics.cameraFacingPercent >= 75 && metrics.faceVisiblePercent >= 70) {
    reasons.push({
      category: "camera_facing",
      type: "strength",
      message: "Camera-facing signal is steady for most of the session.",
    });
  } else {
    reasons.push({
      category: "camera_facing",
      type: "improvement",
      message:
        "Camera-facing score drops when your face is not visible or centered.",
    });
  }

  if (metrics.longestPauseSeconds >= 7) {
    reasons.push({
      category: "delivery",
      type: "warning",
      message: "A long silence was detected and may interrupt delivery flow.",
    });
  }

  return reasons.slice(0, 7);
}

export function getImprovementHints(
  metrics: RealtimeMetrics,
  breakdown: ScoreBreakdown,
  options?: CalculateScoreOptions,
): string[] {
  const status = getScoreStatus(metrics, options);

  if (status === "insufficient_data") {
    return ["Start practice, microphone, streaming, and camera to collect scoring signals."];
  }

  if (status === "warming_up") {
    return ["Speak for a few more seconds so the scoring estimate has enough signal."];
  }

  const hints: string[] = [];

  if (status === "limited_data") {
    hints.push("Practice for at least 10 seconds to get more comprehensive feedback.");
  }

  if (breakdown.pace < 75) {
    hints.push(
      metrics.paceStatus === "too_fast"
        ? "Slow slightly and leave short pauses between points."
        : "Add a little more forward motion while keeping words clear.",
    );
  }

  if (breakdown.clarity < 75) {
    hints.push(
      metrics.fillerRate > 8
        ? "Replace fillers with a brief pause before the next sentence."
        : "Use shorter pauses and finish each sentence cleanly.",
    );
  }

  if (breakdown.delivery < 75) {
    hints.push("Keep shoulders level and reduce long silent gaps.");
  }

  if (breakdown.eyeContact < 75) {
    hints.push("Keep notes near the camera and return to center between points.");
  }

  if (breakdown.engagement < 75) {
    hints.push("Stay visible in frame and keep your voice active through each answer.");
  }

  if (hints.length === 0) {
    hints.push("Maintain this cadence and camera-facing consistency through the full answer.");
  }

  return hints.slice(0, 4);
}

export function calculateScoreSnapshot(
  metrics: RealtimeMetrics,
  options?: CalculateScoreOptions,
): ScoreSnapshot {
  const status = getScoreStatus(metrics, options);
  const isScorable = status === "ready" || status === "limited_data";
  const breakdown =
    isScorable ? calculateReadyBreakdown(metrics) : EMPTY_SCORE_BREAKDOWN;
  const label = labelScore(breakdown.overall, status);

  return {
    status,
    label,
    breakdown,
    reasons: getScoreReasons(metrics, breakdown, options),
    improvementHints: getImprovementHints(metrics, breakdown, options),
    generatedAt: Date.now(),
    metricsSummary: {
      elapsedSeconds: metrics.elapsedSeconds,
      wordCount: metrics.wordCount,
      wordsPerMinute: metrics.wordsPerMinute,
      fillerRate: metrics.fillerRate,
      pauseCount: metrics.pauseCount,
      faceVisiblePercent: metrics.faceVisiblePercent,
      cameraFacingPercent: metrics.cameraFacingPercent,
    },
  };
}

export function createEmptyScoreSnapshot(): ScoreSnapshot {
  const generatedAt = Date.now();

  return {
    status: "insufficient_data",
    label: "Incomplete",
    breakdown: EMPTY_SCORE_BREAKDOWN,
    reasons: [
      {
        category: "overall",
        type: "warning",
        message:
          "Start practice signals before scoring. The engine needs transcript, audio, or camera data.",
      },
    ],
    improvementHints: [
      "Start practice, microphone, streaming, and camera to collect scoring signals.",
    ],
    generatedAt,
    metricsSummary: {
      elapsedSeconds: 0,
      wordCount: 0,
      wordsPerMinute: 0,
      fillerRate: 0,
      pauseCount: 0,
      faceVisiblePercent: 0,
      cameraFacingPercent: 0,
    },
  };
}

function calculateReadyBreakdown(metrics: RealtimeMetrics): ScoreBreakdown {
  const weighted: WeightedScoreInput = {
    clarity: calculateClarityScore(metrics),
    pace: calculatePaceScore(metrics),
    delivery: calculateDeliveryScore(metrics),
    engagement: calculateEngagementScore(metrics),
    eyeContact: calculateEyeContactScore(metrics),
  };

  return {
    ...weighted,
    overall: calculateOverallScore(weighted),
  };
}

function getScoreStatus(
  metrics: RealtimeMetrics,
  options?: CalculateScoreOptions,
): ScoreStatus {
  if (!hasAnyPracticeSignal(metrics)) return "insufficient_data";
  if (
    metrics.elapsedSeconds < MIN_READY_SECONDS ||
    metrics.wordCount < MIN_READY_WORDS
  ) {
    if (options?.mode === "final" && metrics.wordCount >= MIN_READY_WORDS) {
      return "limited_data";
    }
    return "warming_up";
  }
  return "ready";
}

function hasAnyPracticeSignal(metrics: RealtimeMetrics): boolean {
  return (
    metrics.wordCount > 0 ||
    metrics.speakingSeconds > 0 ||
    metrics.faceVisiblePercent > 0 ||
    metrics.cameraFacingPercent > 0 ||
    metrics.postureSignal === "upright" ||
    metrics.postureSignal === "leaning"
  );
}

function pausesPerMinute(metrics: RealtimeMetrics): number {
  const minutes = Math.max(metrics.elapsedSeconds / 60, 0.25);
  return metrics.pauseCount / minutes;
}

function postureToScore(posture: RealtimeMetrics["postureSignal"]): number {
  switch (posture) {
    case "upright":
      return 92;
    case "leaning":
      return 68;
    case "not_detected":
      return 52;
    default:
      return 45;
  }
}

function engagementSignalToScore(
  signal: RealtimeMetrics["engagementSignal"],
): number {
  switch (signal) {
    case "strong":
      return 92;
    case "steady":
      return 76;
    case "low":
      return 52;
    default:
      return 45;
  }
}

function percentToScore(percent: number, floor: number): number {
  return clampScore(floor + (clampScore(percent) / 100) * (100 - floor));
}

function speakingActivityScore(metrics: RealtimeMetrics): number {
  if (metrics.elapsedSeconds <= 0) return 0;

  const speakingPercent = (metrics.speakingSeconds / metrics.elapsedSeconds) * 100;

  if (speakingPercent >= 35 && speakingPercent <= 85) return 92;

  if (speakingPercent < 35) {
    return clampScore(30 + speakingPercent * 1.7);
  }

  return clampScore(92 - (speakingPercent - 85) * 1.1);
}

function pauseBehaviorScore(metrics: RealtimeMetrics): number {
  let score = 92;
  const pauseRate = pausesPerMinute(metrics);

  if (pauseRate > 3) {
    score -= Math.min(30, (pauseRate - 3) * 7);
  }

  if (metrics.longestPauseSeconds > 4) {
    score -= Math.min(20, (metrics.longestPauseSeconds - 4) * 4);
  }

  if (metrics.currentPauseSeconds > 3) {
    score -= Math.min(10, (metrics.currentPauseSeconds - 3) * 3);
  }

  return clampScore(score);
}

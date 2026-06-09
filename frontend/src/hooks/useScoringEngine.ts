import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeMetrics } from "./useRealtimeMetrics";
import {
  calculateScoreSnapshot,
  createEmptyScoreSnapshot,
  type ScoreBreakdown,
  type ScoreLabel,
  type ScoreReason,
  type ScoreSnapshot,
  type ScoreStatus,
} from "../lib/scoring";

const SCORE_UPDATE_INTERVAL_MS = 1500;

export type UseScoringEngineInput = {
  metrics: RealtimeMetrics;
  isPracticeActive: boolean;
};

export type UseScoringEngineResult = {
  scoreStatus: ScoreStatus;
  scoreSnapshot: ScoreSnapshot;
  breakdown: ScoreBreakdown;
  overallScore: number;
  label: ScoreLabel;
  reasons: ScoreReason[];
  improvementHints: string[];
  lastUpdatedAt: number | null;
  resetScoreSnapshot: () => void;
  calculateFinalScoreSnapshot: (finalMetrics: RealtimeMetrics) => ScoreSnapshot;
};

export function useScoringEngine({
  metrics,
  isPracticeActive,
}: UseScoringEngineInput): UseScoringEngineResult {
  const metricsRef = useRef(metrics);
  const [scoreSnapshot, setScoreSnapshot] = useState<ScoreSnapshot>(() =>
    calculateScoreSnapshot(metrics),
  );
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(
    scoreSnapshot.generatedAt,
  );

  useEffect(() => {
    metricsRef.current = metrics;
  });

  const refreshScore = useCallback(() => {
    const nextSnapshot = calculateScoreSnapshot(metricsRef.current);
    setScoreSnapshot(nextSnapshot);
    setLastUpdatedAt(nextSnapshot.generatedAt);
  }, []);

  const resetScoreSnapshot = useCallback(() => {
    const emptySnapshot = createEmptyScoreSnapshot();
    setScoreSnapshot(emptySnapshot);
    setLastUpdatedAt(null);
  }, []);

  const calculateFinalScoreSnapshot = useCallback(
    (finalMetrics: RealtimeMetrics): ScoreSnapshot => {
      const finalS = calculateScoreSnapshot(finalMetrics, { mode: "final" });
      setScoreSnapshot(finalS);
      setLastUpdatedAt(finalS.generatedAt);
      return finalS;
    },
    [],
  );

  useEffect(() => {
    if (isMetricsReset(metrics)) {
      resetScoreSnapshot();
      return;
    }

    if (metrics.metricsStatus === "ready" || metrics.metricsStatus === "paused") {
      refreshScore();
    }
  }, [
    metrics.elapsedSeconds,
    metrics.metricsStatus,
    metrics.startedAt,
    metrics.wordCount,
    refreshScore,
    resetScoreSnapshot,
  ]);

  useEffect(() => {
    if (
      metrics.metricsStatus === "idle" ||
      (!isPracticeActive &&
        metrics.metricsStatus !== "warming_up" &&
        metrics.metricsStatus !== "active")
    ) {
      return undefined;
    }

    refreshScore();
    const intervalId = window.setInterval(refreshScore, SCORE_UPDATE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPracticeActive, metrics.metricsStatus, refreshScore]);

  return {
    scoreStatus: scoreSnapshot.status,
    scoreSnapshot,
    breakdown: scoreSnapshot.breakdown,
    overallScore: scoreSnapshot.breakdown.overall,
    label: scoreSnapshot.label,
    reasons: scoreSnapshot.reasons,
    improvementHints: scoreSnapshot.improvementHints,
    lastUpdatedAt,
    resetScoreSnapshot,
    calculateFinalScoreSnapshot,
  };
}

function isMetricsReset(metrics: RealtimeMetrics): boolean {
  return (
    metrics.metricsStatus === "idle" &&
    metrics.startedAt === null &&
    metrics.elapsedSeconds === 0 &&
    metrics.wordCount === 0
  );
}

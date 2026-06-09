import { useCallback, useMemo, useState } from "react";
import type { PracticeMode, SelectedPracticePrompt } from "../app/store";
import type { RealtimeMetrics } from "./useRealtimeMetrics";
import type { TranscriptSegment } from "./useLiveTranscript";
import type { ScoreSnapshot } from "../lib/scoring";
import {
  generateCoachingReport,
  type CoachingMode,
  type CoachingReportOutput,
} from "../lib/api";
import { serializePromptContext } from "../lib/promptContext";

export type CoachingReportStatus =
  | "idle"
  | "ready"
  | "generating"
  | "complete"
  | "error"
  | "insufficient_data";

export type UseCoachingReportInput = {
  mode: PracticeMode;
  transcript: string;
  finalTranscriptSegments: TranscriptSegment[];
  interimText: string;
  metrics: RealtimeMetrics;
  scoreSnapshot: ScoreSnapshot;
  prompt?: string | null;
  promptContext?: SelectedPracticePrompt | null;
};

export type UseCoachingReportResult = {
  status: CoachingReportStatus;
  report: CoachingReportOutput | null;
  error: string | null;
  lastGeneratedAt: string | null;
  provider: CoachingReportOutput["provider"] | null;
  canGenerate: boolean;
  readinessMessage: string;
  generateReport: () => Promise<void>;
  resetReport: () => void;
};

export function useCoachingReport({
  mode,
  transcript,
  finalTranscriptSegments,
  interimText,
  metrics,
  scoreSnapshot,
  prompt,
  promptContext,
}: UseCoachingReportInput): UseCoachingReportResult {
  const [report, setReport] = useState<CoachingReportOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const transcriptWordCount = useMemo(
    () => transcript.trim().split(/\s+/).filter(Boolean).length,
    [transcript],
  );

  const readinessMessage = useMemo(() => {
    if (transcriptWordCount < 12) {
      return "Speak a little more before generating an AI report.";
    }
    if (scoreSnapshot.status !== "ready" && scoreSnapshot.status !== "limited_data") {
      return "Wait for the deterministic score snapshot to become ready.";
    }
    if (metrics.metricsStatus === "idle") {
      return "Start a practice session before generating an AI report.";
    }
    return "Ready to generate a practice report.";
  }, [metrics.metricsStatus, scoreSnapshot.status, transcriptWordCount]);

  const canGenerate =
    transcriptWordCount >= 12 &&
    (scoreSnapshot.status === "ready" || scoreSnapshot.status === "limited_data") &&
    metrics.metricsStatus !== "idle" &&
    !isGenerating;

  const generateReport = useCallback(async () => {
    if (!canGenerate) {
      setError(readinessMessage);
      return;
    }

    if (import.meta.env.DEV) {
      const overall = scoreSnapshot.breakdown.overall;
      if (overall === 0) {
        console.warn(
          `[PitchPilot DEV WARNING] Generating report but score is 0. Status: ${scoreSnapshot.status}`,
        );
      }
    }

    setIsGenerating(true);
    setError(null);

    const promptContextPayload = serializePromptContext(promptContext);
    const result = await generateCoachingReport({
      transcript,
      finalTranscriptSegments: finalTranscriptSegments.map((segment) => ({
        text: segment.text,
        confidence: segment.confidence,
        startMs: segment.startMs,
        endMs: segment.endMs,
      })),
      interimText,
      mode: mapPracticeMode(mode),
      metrics: metrics as unknown as Record<string, unknown>,
      scoreSnapshot: scoreSnapshot as unknown as Record<string, unknown>,
      durationSeconds: metrics.elapsedSeconds,
      generatedFrom: "current_session",
      prompt: prompt ?? promptContext?.text ?? undefined,
      promptContext: promptContextPayload,
    });

    setReport(result.data);
    setError(result.error);
    setIsGenerating(false);
  }, [
    canGenerate,
    finalTranscriptSegments,
    interimText,
    metrics,
    mode,
    prompt,
    promptContext,
    readinessMessage,
    scoreSnapshot,
    transcript,
  ]);

  const resetReport = useCallback(() => {
    setReport(null);
    setError(null);
    setIsGenerating(false);
  }, []);

  const status: CoachingReportStatus = isGenerating
    ? "generating"
    : error
      ? "error"
      : report
        ? "complete"
        : canGenerate
          ? "ready"
          : "insufficient_data";

  return {
    status,
    report,
    error,
    lastGeneratedAt: report?.generatedAt ?? null,
    provider: report?.provider ?? null,
    canGenerate,
    readinessMessage,
    generateReport,
    resetReport,
  };
}

function mapPracticeMode(mode: PracticeMode): CoachingMode {
  switch (mode) {
    case "pitch":
      return "startup_pitch";
    case "elevator":
      return "elevator_pitch";
    case "class":
      return "presentation";
    case "interview":
    case "presentation":
    case "custom":
      return mode;
  }
}

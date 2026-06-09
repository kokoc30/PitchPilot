/**
 * useRealtimeMetrics.ts
 *
 * Realtime metrics engine for PitchPilot AI — Task 8.
 *
 * Consumes live signals (transcript, audio level, MediaPipe) and produces
 * deterministic metrics updated at most once per second.
 *
 * These are LOCAL ESTIMATES. Final scoring arrives in Task 10.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { CameraFacingEstimate, FaceDirection, PostureSignal } from "./useMediaPipeTracking";
import type { TranscriptStatus } from "./useLiveTranscript";
import type { MicrophoneStatus } from "./useMicrophone";
import {
  calculateFillerRate,
  calculateWordsPerMinute,
  classifyPace,
  clampMetric,
  countFillerWords,
  countWords,
  topFillerWords,
  type FillerWordResult,
  type PaceStatus,
} from "../lib/metrics";

// ── Constants ─────────────────────────────────────────────────────────────────

/** RMS audio level threshold above which we consider the user to be speaking. */
const SPEAKING_LEVEL_THRESHOLD = 0.04;

/** Seconds of silence required to register a new pause event. */
const PAUSE_DETECTION_SECONDS = 1.5;

/** Metrics ticker interval (ms). */
const TICK_INTERVAL_MS = 1000;

// ── Types ─────────────────────────────────────────────────────────────────────

export type MetricsStatus =
  | "idle"
  | "warming_up"
  | "active"
  | "paused"
  | "ready";

export type EngagementSignal = "strong" | "steady" | "low" | "unknown";

export type RealtimeMetrics = {
  // Session timing
  startedAt: number | null; // epoch ms
  elapsedSeconds: number;

  // Speech content
  wordCount: number;
  wordsPerMinute: number;
  paceStatus: PaceStatus;

  // Filler words
  fillerWordCount: number;
  fillerRate: number; // 0–100
  fillerBreakdown: FillerWordResult;
  topFillers: Array<{ word: string; count: number }>;

  // Pauses
  pauseCount: number;
  currentPauseSeconds: number;
  longestPauseSeconds: number;

  // Speaking activity
  speakingSeconds: number;
  silenceSeconds: number;

  // Visual delivery (MediaPipe-derived)
  faceVisiblePercent: number; // 0–100
  cameraFacingPercent: number; // 0–100
  postureSignal: PostureSignal;

  // Engagement
  engagementSignal: EngagementSignal;

  // Status
  metricsStatus: MetricsStatus;
};

export type UseRealtimeMetricsInput = {
  // Transcript
  fullTranscript: string;
  interimText: string;
  transcriptStatus: TranscriptStatus;

  // Audio
  microphoneStatus: MicrophoneStatus;
  audioLevel: number; // 0–1

  // MediaPipe
  faceVisible: boolean;
  faceDirection: FaceDirection;
  cameraFacingEstimate: CameraFacingEstimate;
  postureSignal: PostureSignal;

  // Session
  isPracticeActive: boolean;
};

export type UseRealtimeMetricsResult = RealtimeMetrics & {
  startMetrics: () => void;
  stopMetrics: () => void;
  resetMetrics: () => void;
  forceFinalMetricsUpdate: () => RealtimeMetrics;
};

// ── Initial state ─────────────────────────────────────────────────────────────

function createInitialMetrics(): RealtimeMetrics {
  return {
    startedAt: null,
    elapsedSeconds: 0,
    wordCount: 0,
    wordsPerMinute: 0,
    paceStatus: "unknown",
    fillerWordCount: 0,
    fillerRate: 0,
    fillerBreakdown: { total: 0, byWord: {} },
    topFillers: [],
    pauseCount: 0,
    currentPauseSeconds: 0,
    longestPauseSeconds: 0,
    speakingSeconds: 0,
    silenceSeconds: 0,
    faceVisiblePercent: 0,
    cameraFacingPercent: 0,
    postureSignal: "unknown",
    engagementSignal: "unknown",
    metricsStatus: "idle",
  };
}

// ── Engagement signal calculation ─────────────────────────────────────────────

function deriveEngagementSignal(
  faceVisiblePercent: number,
  cameraFacingPercent: number,
  postureSignal: PostureSignal,
  audioLevel: number,
  elapsedSeconds: number,
): EngagementSignal {
  if (elapsedSeconds < 5) return "unknown";

  let score = 0;

  // Face visible weight
  if (faceVisiblePercent >= 80) score += 3;
  else if (faceVisiblePercent >= 50) score += 2;
  else if (faceVisiblePercent >= 20) score += 1;

  // Camera-facing weight
  if (cameraFacingPercent >= 75) score += 3;
  else if (cameraFacingPercent >= 50) score += 2;
  else if (cameraFacingPercent >= 25) score += 1;

  // Posture weight
  if (postureSignal === "upright") score += 2;
  else if (postureSignal === "leaning") score += 1;

  // Audio activity weight
  if (audioLevel >= SPEAKING_LEVEL_THRESHOLD) score += 2;

  // Scale: max = 10, thresholds: strong >= 7, steady >= 4, low < 4
  if (score >= 7) return "strong";
  if (score >= 4) return "steady";
  return "low";
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRealtimeMetrics({
  fullTranscript,
  interimText,
  transcriptStatus,
  microphoneStatus,
  audioLevel,
  faceVisible,
  faceDirection,
  cameraFacingEstimate,
  postureSignal,
  isPracticeActive,
}: UseRealtimeMetricsInput): UseRealtimeMetricsResult {
  const [metrics, setMetrics] = useState<RealtimeMetrics>(createInitialMetrics);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tracking refs — updated every tick, not causing re-renders
  const isActiveRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  // Per-tick accumulators
  const totalTicksRef = useRef(0);
  const faceVisibleTicksRef = useRef(0);
  const cameraFacingTicksRef = useRef(0);

  // Pause tracking
  const silenceStartRef = useRef<number | null>(null); // when silence started
  const inPauseRef = useRef(false); // are we counting this as a pause?
  const pauseCountRef = useRef(0);
  const longestPauseRef = useRef(0);
  const speakingSecondsRef = useRef(0);
  const silenceSecondsRef = useRef(0);

  // Audio level ref for inter-tick access
  const audioLevelRef = useRef(audioLevel);
  const faceVisibleRef = useRef(faceVisible);
  const faceDirectionRef = useRef(faceDirection);
  const cameraFacingRef = useRef(cameraFacingEstimate);
  const postureSignalRef = useRef(postureSignal);
  const fullTranscriptRef = useRef(fullTranscript);
  const interimTextRef = useRef(interimText);

  // Keep refs in sync with the latest rendered props
  useEffect(() => {
    audioLevelRef.current = audioLevel;
    faceVisibleRef.current = faceVisible;
    faceDirectionRef.current = faceDirection;
    cameraFacingRef.current = cameraFacingEstimate;
    postureSignalRef.current = postureSignal;
    fullTranscriptRef.current = fullTranscript;
    interimTextRef.current = interimText;
  });

  // ── Tick logic ──────────────────────────────────────────────────────────────

  const tick = useCallback(() => {
    if (!isActiveRef.current || startedAtRef.current === null) return;

    const now = Date.now();
    const elapsedSeconds = (now - startedAtRef.current) / 1000;

    // Visual delivery accumulation
    totalTicksRef.current += 1;
    const fv = faceVisibleRef.current;
    const cf =
      cameraFacingRef.current === "good" ||
      faceDirectionRef.current === "center";

    if (fv) faceVisibleTicksRef.current += 1;
    if (cf) cameraFacingTicksRef.current += 1;

    const faceVisiblePercent = clampMetric(
      totalTicksRef.current > 0
        ? Math.round((faceVisibleTicksRef.current / totalTicksRef.current) * 100)
        : 0,
      0,
      100,
    );
    const cameraFacingPercent = clampMetric(
      totalTicksRef.current > 0
        ? Math.round(
            (cameraFacingTicksRef.current / totalTicksRef.current) * 100,
          )
        : 0,
      0,
      100,
    );

    // Speaking/silence tracking
    const level = audioLevelRef.current;
    const isSpeaking = level >= SPEAKING_LEVEL_THRESHOLD;

    if (isSpeaking) {
      speakingSecondsRef.current += 1;
      // Speaking resumed — end any pause
      if (silenceStartRef.current !== null) {
        const pauseDuration = (now - silenceStartRef.current) / 1000;
        if (inPauseRef.current) {
          longestPauseRef.current = Math.max(
            longestPauseRef.current,
            pauseDuration,
          );
        }
        silenceStartRef.current = null;
        inPauseRef.current = false;
      }
    } else {
      silenceSecondsRef.current += 1;
      if (silenceStartRef.current === null) {
        // Start of a potential new pause
        silenceStartRef.current = now;
        inPauseRef.current = false;
      } else {
        const silenceDuration = (now - silenceStartRef.current) / 1000;
        if (silenceDuration >= PAUSE_DETECTION_SECONDS && !inPauseRef.current) {
          // Crossed the threshold — register a pause
          pauseCountRef.current += 1;
          inPauseRef.current = true;
        }
        if (inPauseRef.current) {
          longestPauseRef.current = Math.max(
            longestPauseRef.current,
            silenceDuration,
          );
        }
      }
    }

    const currentPauseSeconds =
      inPauseRef.current && silenceStartRef.current !== null
        ? (now - silenceStartRef.current) / 1000
        : 0;

    // ── Transcript metrics ──────────────────────────────────────────────────

    const combinedText = [fullTranscript, interimText]
      .filter(Boolean)
      .join(" ");
    const wordCount = countWords(combinedText);
    const filler = countFillerWords(combinedText);
    const fillerWordCount = filler.total;
    const fillerRate = calculateFillerRate(fillerWordCount, wordCount);
    const wordsPerMinute = calculateWordsPerMinute(wordCount, elapsedSeconds);
    const paceStatus = classifyPace(wordsPerMinute, elapsedSeconds, wordCount);
    const tops = topFillerWords(filler.byWord, 3);

    // ── Metrics status ──────────────────────────────────────────────────────

    let metricsStatus: MetricsStatus = "active";
    if (elapsedSeconds < 5) {
      metricsStatus = "warming_up";
    } else if (!isPracticeActive) {
      metricsStatus = "paused";
    }

    // ── Engagement ──────────────────────────────────────────────────────────

    const engagementSignal = deriveEngagementSignal(
      faceVisiblePercent,
      cameraFacingPercent,
      postureSignalRef.current,
      level,
      elapsedSeconds,
    );

    setMetrics({
      startedAt: startedAtRef.current,
      elapsedSeconds,
      wordCount,
      wordsPerMinute,
      paceStatus,
      fillerWordCount,
      fillerRate,
      fillerBreakdown: filler,
      topFillers: tops,
      pauseCount: pauseCountRef.current,
      currentPauseSeconds: Math.round(currentPauseSeconds * 10) / 10,
      longestPauseSeconds: Math.round(longestPauseRef.current * 10) / 10,
      speakingSeconds: speakingSecondsRef.current,
      silenceSeconds: silenceSecondsRef.current,
      faceVisiblePercent,
      cameraFacingPercent,
      postureSignal: postureSignalRef.current,
      engagementSignal,
      metricsStatus,
    });
  }, [fullTranscript, interimText, isPracticeActive]);

  // ── Timer management ────────────────────────────────────────────────────────

  const stopTicker = useCallback(() => {
    if (tickerRef.current !== null) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  const startTicker = useCallback(() => {
    stopTicker();
    tickerRef.current = setInterval(tick, TICK_INTERVAL_MS);
  }, [stopTicker, tick]);

  // ── Public actions ──────────────────────────────────────────────────────────

  const startMetrics = useCallback(() => {
    if (isActiveRef.current) return; // already running
    isActiveRef.current = true;
    startedAtRef.current = Date.now();
    startTicker();
    setMetrics((prev) => ({
      ...prev,
      startedAt: startedAtRef.current,
      metricsStatus: "warming_up",
    }));
  }, [startTicker]);

  const stopMetrics = useCallback(() => {
    isActiveRef.current = false;
    stopTicker();
    setMetrics((prev) => ({
      ...prev,
      metricsStatus: prev.startedAt !== null ? "ready" : "idle",
    }));
  }, [stopTicker]);

  const resetMetrics = useCallback(() => {
    isActiveRef.current = false;
    startedAtRef.current = null;
    stopTicker();

    totalTicksRef.current = 0;
    faceVisibleTicksRef.current = 0;
    cameraFacingTicksRef.current = 0;
    silenceStartRef.current = null;
    inPauseRef.current = false;
    pauseCountRef.current = 0;
    longestPauseRef.current = 0;
    speakingSecondsRef.current = 0;
    silenceSecondsRef.current = 0;

    setMetrics(createInitialMetrics());
  }, [stopTicker]);

  const forceFinalMetricsUpdate = useCallback((): RealtimeMetrics => {
    const now = Date.now();
    const elapsedSeconds = startedAtRef.current !== null
      ? (now - startedAtRef.current) / 1000
      : 0;

    const faceVisiblePercent = clampMetric(
      totalTicksRef.current > 0
        ? Math.round((faceVisibleTicksRef.current / totalTicksRef.current) * 100)
        : 0,
      0,
      100,
    );
    const cameraFacingPercent = clampMetric(
      totalTicksRef.current > 0
        ? Math.round(
            (cameraFacingTicksRef.current / totalTicksRef.current) * 100,
          )
        : 0,
      0,
      100,
    );

    const currentPauseSeconds =
      inPauseRef.current && silenceStartRef.current !== null
        ? (now - silenceStartRef.current) / 1000
        : 0;

    const combinedText = [fullTranscriptRef.current, interimTextRef.current]
      .filter(Boolean)
      .join(" ");
    const wordCount = countWords(combinedText);
    const filler = countFillerWords(combinedText);
    const fillerWordCount = filler.total;
    const fillerRate = calculateFillerRate(fillerWordCount, wordCount);
    const wordsPerMinute = calculateWordsPerMinute(wordCount, elapsedSeconds);
    const paceStatus = classifyPace(wordsPerMinute, elapsedSeconds, wordCount);
    const tops = topFillerWords(filler.byWord, 3);

    const metricsStatus: MetricsStatus = "ready";

    const engagementSignal = deriveEngagementSignal(
      faceVisiblePercent,
      cameraFacingPercent,
      postureSignalRef.current,
      audioLevelRef.current,
      elapsedSeconds,
    );

    const finalResult: RealtimeMetrics = {
      startedAt: startedAtRef.current,
      elapsedSeconds,
      wordCount,
      wordsPerMinute,
      paceStatus,
      fillerWordCount,
      fillerRate,
      fillerBreakdown: filler,
      topFillers: tops,
      pauseCount: pauseCountRef.current,
      currentPauseSeconds: Math.round(currentPauseSeconds * 10) / 10,
      longestPauseSeconds: Math.round(longestPauseRef.current * 10) / 10,
      speakingSeconds: speakingSecondsRef.current,
      silenceSeconds: silenceSecondsRef.current,
      faceVisiblePercent,
      cameraFacingPercent,
      postureSignal: postureSignalRef.current,
      engagementSignal,
      metricsStatus,
    };

    setMetrics(finalResult);
    return finalResult;
  }, []);

  // ── Auto-start when practice becomes active ─────────────────────────────────

  useEffect(() => {
    if (isPracticeActive && !isActiveRef.current) {
      startMetrics();
    } else if (!isPracticeActive && isActiveRef.current) {
      stopMetrics();
    }
  }, [isPracticeActive, startMetrics, stopMetrics]);

  // ── Transcript/interim changes restart the ticker so the next tick ──────────
  // immediately picks up updated text (avoids 1-second lag on first word).
  const prevTranscriptRef = useRef("");
  useEffect(() => {
    const combined = [fullTranscript, interimText].filter(Boolean).join(" ");
    if (combined !== prevTranscriptRef.current && isActiveRef.current) {
      prevTranscriptRef.current = combined;
      // Run a tick immediately so word count updates feel instant
      tick();
    }
  }, [fullTranscript, interimText, tick]);

  // ── Transcription status → auto-start/stop ──────────────────────────────────

  useEffect(() => {
    if (
      (transcriptStatus === "listening" || transcriptStatus === "transcribing") &&
      isPracticeActive &&
      !isActiveRef.current
    ) {
      startMetrics();
    }
    if (transcriptStatus === "stopped" && isActiveRef.current) {
      stopMetrics();
    }
  }, [transcriptStatus, isPracticeActive, startMetrics, stopMetrics]);

  // ── Microphone inactive → stop ──────────────────────────────────────────────

  useEffect(() => {
    if (microphoneStatus === "inactive" && isActiveRef.current) {
      stopMetrics();
    }
  }, [microphoneStatus, stopMetrics]);

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopTicker();
    };
  }, [stopTicker]);

  return {
    ...metrics,
    startMetrics,
    stopMetrics,
    resetMetrics,
    forceFinalMetricsUpdate,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { useAppStore } from "../../app/store";
import type {
  AudioStreamingStatus,
  MicrophoneRuntimeStatus,
} from "../../app/store";
import { AudioDiagnostics } from "../../components/audio/AudioDiagnostics";
import { CoachingDevPanel } from "../../components/coaching/CoachingDevPanel";
import { CoachingReportPanel } from "../../components/coaching/CoachingReportPanel";
import { RetryComparisonPanel } from "../../components/comparison/RetryComparisonPanel";
import { MicrophonePanel } from "../../components/audio/MicrophonePanel";
import { LiveSignalGrid } from "../../components/practice/LiveSignalGrid";
import { PracticePromptPanel } from "../../components/practice/PracticePromptPanel";
import { ResumeQuestionPanel } from "../../components/practice/ResumeQuestionPanel";
import { ResumeUploadPanel } from "../../components/practice/ResumeUploadPanel";
import {
  PracticeSessionHeader,
  type SessionLifecycle,
} from "../../components/practice/PracticeSessionHeader";
import { RealtimeChartCard } from "../../components/practice/RealtimeChartCard";
import { CurrentQuestionPanel } from "../../components/practice/CurrentQuestionPanel";
import { SignalDiagnosticsPanel } from "../../components/practice/SignalDiagnosticsPanel";
import { RealtimeMetricsPanel } from "../../components/metrics/RealtimeMetricsPanel";
import { ScoreBreakdownPanel } from "../../components/scoring/ScoreBreakdownPanel";
import { ScorePendingCard } from "../../components/scoring/ScorePendingCard";
import { SaveSessionPanel } from "../../components/sessions/SaveSessionPanel";
import { LiveTranscriptPanel } from "../../components/transcript/LiveTranscriptPanel";
import { MediaPipeOverlay } from "../../components/webcam/MediaPipeOverlay";
import { TrackingDiagnostics } from "../../components/webcam/TrackingDiagnostics";
import { WebcamDiagnostics } from "../../components/webcam/WebcamDiagnostics";
import { WebcamPreview } from "../../components/webcam/WebcamPreview";
import { useAudioStreamer } from "../../hooks/useAudioStreamer";
import { useLiveTranscript } from "../../hooks/useLiveTranscript";
import { useMediaPipeTracking } from "../../hooks/useMediaPipeTracking";
import { useMicrophone } from "../../hooks/useMicrophone";
import { useCoachingReport } from "../../hooks/useCoachingReport";
import { useRealtimeMetrics } from "../../hooks/useRealtimeMetrics";
import { useResumeRag } from "../../hooks/useResumeRag";
import { useRetryComparison } from "../../hooks/useRetryComparison";
import { useScoringEngine } from "../../hooks/useScoringEngine";
import { useWebcam } from "../../hooks/useWebcam";
import { useResumeQuestions } from "../../hooks/useResumeQuestions";
import { useResumeQuestionHistory } from "../../hooks/useResumeQuestionHistory";
import { sanitizeSelectedPrompt } from "../../lib/promptContext";
import type { ResumeQuestion, ResumeInterviewType, ResumeQuestionDifficulty } from "../../lib/api";
import { cn } from "../../lib/utils";
import { createRealtimeSocket } from "../../lib/websocket";
import type { RealtimeMessage } from "../../lib/websocket";
import { RealtimeStatusPanel } from "../realtime/RealtimeStatusPanel";
import {
  demoCoachingReport,
  demoMetrics,
  demoRetryComparison,
  demoScoreSnapshot,
  demoTranscriptSegments,
  demoTranscriptText,
} from "../../lib/demoData";

type RealtimeConnection = ReturnType<typeof createRealtimeSocket>;

const FINAL_TRANSCRIPT_FLUSH_MS = 800;

function microphoneStatusForStore(
  status: ReturnType<typeof useMicrophone>["status"],
): MicrophoneRuntimeStatus {
  return status;
}

function audioStreamingStatusForStore(
  connectionStatus: ReturnType<typeof useAudioStreamer>["connectionStatus"],
  isStreaming: boolean,
): AudioStreamingStatus {
  if (isStreaming) return "streaming";
  return connectionStatus;
}





export function PracticePage() {
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [lastMessage, setLastMessage] = useState("No realtime messages yet.");
  const [showDevDiagnostics, setShowDevDiagnostics] = useState(false);
  const activeMode = useAppStore((state) => state.activeMode);
  const isDemoMode = useAppStore((state) => state.isDemoMode);
  const isPracticeActive = useAppStore((state) => state.isPracticeActive);
  const websocketStatus = useAppStore((state) => state.websocketStatus);
  const selectedPrompt = useAppStore((state) => state.selectedPrompt);
  const setActiveMode = useAppStore((state) => state.setActiveMode);
  const setPracticeActive = useAppStore((state) => state.setPracticeActive);
  const setWebcamStatus = useAppStore((state) => state.setWebcamStatus);
  const setWebsocketStatus = useAppStore((state) => state.setWebsocketStatus);
  const setMicrophoneStatus = useAppStore((state) => state.setMicrophoneStatus);
  const setAudioStreamingStatus = useAppStore(
    (state) => state.setAudioStreamingStatus,
  );
  const clearSelectedPrompt = useAppStore((state) => state.clearSelectedPrompt);
  const setSelectedPrompt = useAppStore((state) => state.setSelectedPrompt);

  const resumeRag = useResumeRag();

  // Lifted state and hooks for Interview Mode resume questions
  const questions = useResumeQuestions();
  const history = useResumeQuestionHistory();
  const [isQuestionQueueEnded, setIsQuestionQueueEnded] = useState(false);
  const [hasFinalizedPractice, setHasFinalizedPractice] = useState(false);
  const [finalMetricsSnapshot, setFinalMetricsSnapshot] = useState<any | null>(null);
  const [finalScoreSnapshot, setFinalScoreSnapshot] = useState<any | null>(null);
  const [finalTranscriptSnapshot, setFinalTranscriptSnapshot] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  useEffect(() => {
    setIsQuestionQueueEnded(false);
    setHasFinalizedPractice(false);
  }, [activeMode]);

  const [targetRole, setTargetRole] = useState("");
  const [interviewType, setInterviewType] = useState<ResumeInterviewType>("general");
  const [difficulty, setDifficulty] = useState<ResumeQuestionDifficulty>("medium");
  const [count, setCount] = useState(8);
  const [focus, setFocus] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);

  // Load status and resumes when interview mode is active
  useEffect(() => {
    if (activeMode !== "interview") return;
    void resumeRag.loadStatus();
    void resumeRag.loadResumes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode]);

  // Load history and reset when selected resume changes
  useEffect(() => {
    questions.reset();
    setCurrentQuestionIndex(-1);
    setHasFinalizedPractice(false);
    setIsQuestionQueueEnded(false);
    if (resumeRag.selectedResume?.id) {
      void history.load(resumeRag.selectedResume.id);
    } else {
      history.replace([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeRag.selectedResume?.id]);

  const savedById = useMemo(
    () => new Map(history.questions.map((question) => [question.id, question])),
    [history.questions],
  );

  const generatedQuestions = useMemo(
    () =>
      questions.questions.map((question) => ({
        ...question,
        ...(savedById.get(question.id) ?? {}),
      })),
    [questions.questions, savedById],
  );

  const handlePractice = useCallback((question: ResumeQuestion) => {
    setIsQuestionQueueEnded(false);
    setHasFinalizedPractice(false);
    const resume = resumeRag.selectedResume;
    setSelectedPrompt(sanitizeSelectedPrompt({
      text: question.question,
      source: "resume_question",
      resumeId: resume?.id ?? null,
      resumeLabel: question.resumeLabel ?? resume?.filename ?? null,
      questionId: question.id,
      category: question.category,
      difficulty: question.difficulty,
      questionSource: question.source,
      groundedIn: question.groundedIn,
      resumeChunkIds: question.resumeChunkIds,
      suggestedAnswerAngle: question.suggestedAnswerAngle,
    }));

    if (resume && question.isPersisted) {
      void history.markPracticed(resume.id, question);
    }

    // Set index if it is part of the current generatedQuestions batch
    const idx = questions.questions.findIndex((q) => q.id === question.id);
    setCurrentQuestionIndex(idx);
  }, [questions.questions, resumeRag.selectedResume, history, setSelectedPrompt]);

  const handleGenerate = useCallback(async () => {
    setIsQuestionQueueEnded(false);
    setHasFinalizedPractice(false);
    const resume = resumeRag.selectedResume;
    if (!resume) return;
    const response = await questions.generate(resume.id, {
      targetRole: targetRole.trim() || null,
      interviewType,
      difficulty,
      count: Math.min(Math.max(count, 1), 12),
      focus: focus.trim() || null,
      save: true,
    });
    if (response) {
      if (response.questions.some((question) => question.isPersisted)) {
        void history.load(resume.id);
      }
      if (response.questions.length > 0) {
        const firstQuestion = response.questions[0];
        setSelectedPrompt(sanitizeSelectedPrompt({
          text: firstQuestion.question,
          source: "resume_question",
          resumeId: resume.id,
          resumeLabel: firstQuestion.resumeLabel ?? resume.filename ?? null,
          questionId: firstQuestion.id,
          category: firstQuestion.category,
          difficulty: firstQuestion.difficulty,
          questionSource: firstQuestion.source,
          groundedIn: firstQuestion.groundedIn,
          resumeChunkIds: firstQuestion.resumeChunkIds,
          suggestedAnswerAngle: firstQuestion.suggestedAnswerAngle,
        }));
        setCurrentQuestionIndex(0);
        if (firstQuestion.isPersisted) {
          void history.markPracticed(resume.id, firstQuestion);
        }
      } else {
        setCurrentQuestionIndex(-1);
        clearSelectedPrompt();
      }
    }
  }, [
    resumeRag.selectedResume,
    targetRole,
    interviewType,
    difficulty,
    count,
    focus,
    questions,
    history,
    setSelectedPrompt,
    clearSelectedPrompt,
  ]);



  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      handlePractice(generatedQuestions[prevIndex]);
    }
  }, [currentQuestionIndex, generatedQuestions, handlePractice]);

  const handleClearQuestion = useCallback(() => {
    clearSelectedPrompt();
    setCurrentQuestionIndex(-1);
    setIsQuestionQueueEnded(false);
    setHasFinalizedPractice(false);
  }, [clearSelectedPrompt]);

  const webcam = useWebcam();
  const tracking = useMediaPipeTracking({
    enabled: true,
    isCameraActive: webcam.isActive,
    targetFps: 12,
    videoRef,
  });
  const microphone = useMicrophone();
  const liveTranscript = useLiveTranscript();

  const handleStreamerMessage = useCallback(
    (message: RealtimeMessage) => {
      liveTranscript.handleMessage(message);
      setLastMessage(JSON.stringify(message, null, 2));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveTranscript.handleMessage],
  );

  const streamer = useAudioStreamer({
    stream: microphone.stream,
    isMicrophoneActive: microphone.isActive,
    enabled: true,
    onAck: handleStreamerMessage,
  });

  const metrics = useRealtimeMetrics({
    fullTranscript: liveTranscript.fullTranscript,
    interimText: liveTranscript.interimText,
    transcriptStatus: liveTranscript.status,
    microphoneStatus: microphone.status,
    audioLevel: microphone.audioLevel,
    faceVisible: tracking.faceVisible,
    faceDirection: tracking.faceDirection,
    cameraFacingEstimate: tracking.cameraFacingEstimate,
    postureSignal: tracking.postureSignal,
    isPracticeActive,
  });

  const scoring = useScoringEngine({
    metrics,
    isPracticeActive,
  });
  const retryComparison = useRetryComparison();

  // --- Demo Mode and Final Snapshot Overrides ---
  const currentMetrics = isDemoMode
    ? demoMetrics
    : (finalMetricsSnapshot || metrics);
  
  const currentScoringSnapshot = isDemoMode
    ? demoScoreSnapshot
    : (finalScoreSnapshot || scoring.scoreSnapshot);
    
  const currentRetryComparison = isDemoMode ? demoRetryComparison : retryComparison.comparison;
  const currentActiveAttemptLabel = isDemoMode ? retryComparison.activeAttemptLabel : retryComparison.activeAttemptLabel;
  
  const rawTranscriptText = useMemo(
    () =>
      [liveTranscript.fullTranscript, liveTranscript.interimText]
        .filter(Boolean)
        .join(" "),
    [liveTranscript.fullTranscript, liveTranscript.interimText],
  );

  const transcriptText = isDemoMode ? demoTranscriptText : rawTranscriptText;
  
  const currentTranscript = isDemoMode
    ? demoTranscriptText
    : (finalTranscriptSnapshot || rawTranscriptText);

  const rawPersistedTranscriptSegments = useMemo(
    () =>
      liveTranscript.finalSegments.map((segment) => ({
        text: segment.text,
        confidence: segment.confidence,
        startMs: segment.startMs,
        endMs: segment.endMs,
      })),
    [liveTranscript.finalSegments],
  );

  const persistedTranscriptSegments = isDemoMode ? demoTranscriptSegments : rawPersistedTranscriptSegments;

  const coachingReport = useCoachingReport({
    finalTranscriptSegments: isDemoMode ? demoTranscriptSegments : liveTranscript.finalSegments,
    interimText: isDemoMode ? "" : liveTranscript.interimText,
    metrics: currentMetrics,
    mode: activeMode,
    scoreSnapshot: currentScoringSnapshot,
    transcript: currentTranscript,
    prompt: isDemoMode ? null : selectedPrompt?.text ?? null,
    promptContext: isDemoMode ? null : selectedPrompt ?? null,
  });

  const currentCoachingReport = isDemoMode ? demoCoachingReport : coachingReport.report;
  const currentCoachingStatus = isDemoMode ? "ready" : coachingReport.status;
  const currentCoachingCanGenerate = isDemoMode ? false : coachingReport.canGenerate;

  useEffect(() => {
    setWebcamStatus(webcam.status);
  }, [setWebcamStatus, webcam.status]);

  useEffect(() => {
    setMicrophoneStatus(microphoneStatusForStore(microphone.status));
  }, [microphone.status, setMicrophoneStatus]);

  useEffect(() => {
    setAudioStreamingStatus(
      audioStreamingStatusForStore(streamer.connectionStatus, streamer.isStreaming),
    );
  }, [setAudioStreamingStatus, streamer.connectionStatus, streamer.isStreaming]);

  useEffect(() => {
    return () => {
      connectionRef.current?.close();
      connectionRef.current = null;
    };
  }, []);

  // â”€â”€ Lifecycle derivation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sessionLifecycle: SessionLifecycle = useMemo(() => {
    if (isPracticeActive) {
      if (webcam.isActive && microphone.isActive && streamer.isStreaming) {
        return "live";
      }
      return "preparing";
    }
    if (metrics.startedAt !== null) return "ended";
    return "idle";
  }, [
    isPracticeActive,
    webcam.isActive,
    microphone.isActive,
    streamer.isStreaming,
    metrics.startedAt,
  ]);

  const isChartCollecting =
    sessionLifecycle === "live" || sessionLifecycle === "preparing";

  const shouldShowCommunicationScore =
    hasFinalizedPractice ||
    sessionLifecycle === "ended";

  // â”€â”€ Realtime debug socket actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleRealtimeMessage = (message: RealtimeMessage) => {
    setLastMessage(JSON.stringify(message, null, 2));
  };

  const connect = () => {
    connectionRef.current?.close();
    setWebsocketStatus("connecting");
    setLastMessage("Connecting to realtime backend...");

    connectionRef.current = createRealtimeSocket({
      onOpen: () => setWebsocketStatus("connected"),
      onMessage: handleRealtimeMessage,
      onError: () => {
        setWebsocketStatus("error");
        setLastMessage("WebSocket error. Confirm the backend is running on port 8000.");
      },
      onClose: () => setWebsocketStatus("disconnected"),
    });
  };

  const disconnect = () => {
    connectionRef.current?.close();
    connectionRef.current = null;
    setWebsocketStatus("disconnected");
  };

  const sendPing = () => {
    const sent = connectionRef.current?.sendJson({
      type: "practice_ping",
      mode: activeMode,
      timestamp: new Date().toISOString(),
    });

    if (!sent) {
      setLastMessage("Socket is not open. Connect before sending a ping.");
    }
  };

  // â”€â”€ Control bar actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const finalizePracticeSession = useCallback(async () => {
    if (isFinalizing || finalScoreSnapshot !== null || hasFinalizedPractice) return;
    setIsFinalizing(true);

    // 1. Stop streaming audio first (sends stop signal, closes/flushes websocket)
    if (streamer.isStreaming) {
      await streamer.stopStreaming();
    }

    // 2. Wait for WebSocket final transcript flush
    await new Promise((resolve) => setTimeout(resolve, FINAL_TRANSCRIPT_FLUSH_MS));

    // 3. Force final metrics calculation from useRealtimeMetrics
    const finalM = metrics.forceFinalMetricsUpdate();

    // 4. Calculate final score snapshot using ended/final mode
    const finalS = scoring.calculateFinalScoreSnapshot(finalM);

    // 5. Save snapshots
    setFinalMetricsSnapshot(finalM);
    setFinalScoreSnapshot(finalS);
    setFinalTranscriptSnapshot(transcriptText);

    // 6. Safely stop webcam and microphone
    if (microphone.isActive || microphone.isStarting) {
      microphone.stopMicrophone();
    }
    if (webcam.isActive || webcam.isStarting) {
      webcam.stopCamera();
    }

    // 7. Mark finalized and inactive
    setPracticeActive(false);
    setHasFinalizedPractice(true);
    setIsFinalizing(false);
  }, [
    isFinalizing,
    finalScoreSnapshot,
    hasFinalizedPractice,
    streamer,
    metrics,
    scoring,
    transcriptText,
    microphone,
    webcam,
    setPracticeActive,
  ]);

  const handleStopAll = useCallback(() => {
    void finalizePracticeSession();
  }, [finalizePracticeSession]);

  const handleEndQueue = useCallback(() => {
    setIsQuestionQueueEnded(true);
    void finalizePracticeSession();
  }, [finalizePracticeSession]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < generatedQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      handlePractice(generatedQuestions[nextIndex]);
    } else if (generatedQuestions.length > 0) {
      setCurrentQuestionIndex(generatedQuestions.length);
      handleStopAll();
    }
  }, [currentQuestionIndex, generatedQuestions, handlePractice, handleStopAll]);

  // Start Practice is the primary entry point: it must actually request
  // camera + microphone (so the browser shows permission prompts) and let
  // the auto-start effect below begin streaming once both are ready.
  const handleStartPractice = useCallback(() => {
    setHasFinalizedPractice(false);
    setPracticeActive(true);
    if (webcam.isSupported && !webcam.isActive && !webcam.isStarting) {
      void webcam.startCamera();
    }
    if (
      microphone.isSupported &&
      !microphone.isActive &&
      !microphone.isStarting
    ) {
      void microphone.startMicrophone();
    }
  }, [microphone, setPracticeActive, webcam]);

  const handlePausePractice = useCallback(() => {
    setPracticeActive(false);
    if (streamer.isStreaming) streamer.stopStreaming();
  }, [setPracticeActive, streamer]);

  const handleTogglePractice = useCallback(() => {
    if (isPracticeActive) {
      handlePausePractice();
    } else {
      handleStartPractice();
    }
  }, [handlePausePractice, handleStartPractice, isPracticeActive]);

  // Auto-start audio streaming once the user has clicked Start Practice and
  // the mic + backend WebSocket are both ready. Without this the lifecycle
  // would remain stuck on "preparing" even after camera/mic come online.
  const startStreaming = streamer.startStreaming;
  useEffect(() => {
    if (
      !isPracticeActive ||
      streamer.isStreaming ||
      !microphone.isActive ||
      !streamer.isRecorderSupported ||
      streamer.connectionStatus !== "connected"
    ) {
      return;
    }
    startStreaming();
  }, [
    isPracticeActive,
    microphone.isActive,
    startStreaming,
    streamer.connectionStatus,
    streamer.isRecorderSupported,
    streamer.isStreaming,
  ]);

  const handleResetMetrics = useCallback(() => {
    setHasFinalizedPractice(false);
    setIsQuestionQueueEnded(false);
    setFinalMetricsSnapshot(null);
    setFinalScoreSnapshot(null);
    setFinalTranscriptSnapshot(null);
    metrics.resetMetrics();
    scoring.resetScoreSnapshot();
    coachingReport.resetReport();
  }, [coachingReport, metrics, scoring]);

  const handleClearTranscript = useCallback(() => {
    liveTranscript.clearTranscript();
    coachingReport.resetReport();
  }, [coachingReport, liveTranscript]);

  const hasCurrentAttemptSignal = useMemo(
    () =>
      transcriptText.trim().length > 0 ||
      metrics.elapsedSeconds > 0 ||
      metrics.wordCount > 0 ||
      scoring.scoreSnapshot.status === "ready" ||
      Boolean(coachingReport.report),
    [
      coachingReport.report,
      metrics.elapsedSeconds,
      metrics.wordCount,
      scoring.scoreSnapshot.status,
      transcriptText,
    ],
  );

  const buildCurrentAttemptInput = useCallback(
    () => ({
      mode: activeMode,
      durationSeconds: metrics.elapsedSeconds,
      transcript: transcriptText,
      metrics,
      scoreSnapshot: scoring.scoreSnapshot,
      coachingReport: coachingReport.report,
    }),
    [
      activeMode,
      coachingReport.report,
      metrics,
      scoring.scoreSnapshot,
      transcriptText,
    ],
  );

  const handleSaveBaseline = useCallback(() => {
    retryComparison.saveBaseline(buildCurrentAttemptInput());
  }, [buildCurrentAttemptInput, retryComparison]);

  const handleSaveRetry = useCallback(() => {
    retryComparison.saveRetry(buildCurrentAttemptInput());
  }, [buildCurrentAttemptInput, retryComparison]);

  const handleStartRetry = useCallback(() => {
    setHasFinalizedPractice(false);
    setFinalMetricsSnapshot(null);
    setFinalScoreSnapshot(null);
    setFinalTranscriptSnapshot(null);
    retryComparison.startRetry();
    if (streamer.isStreaming) streamer.stopStreaming();
    setPracticeActive(false);
    liveTranscript.clearTranscript();
    metrics.resetMetrics();
    scoring.resetScoreSnapshot();
    coachingReport.resetReport();
  }, [
    coachingReport,
    liveTranscript,
    metrics,
    retryComparison,
    scoring,
    setPracticeActive,
    streamer,
  ]);

  return (
    <section className="space-y-5">
      {isDemoMode && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.04] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-400">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400">
                Demo mode active
              </p>
              <p className="mt-1 text-[12.5px] text-ink-2">
                Sample data — capture is disconnected from scoring.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isDemoMode &&
        isPracticeActive &&
        (streamer.connectionStatus === "error" ||
          streamer.connectionStatus === "reconnecting") && (
          // Compact connection issue is shown in PracticeSessionHeader via hasConnectionIssue
          null
        )}

      <PracticeSessionHeader
        elapsedSeconds={metrics.elapsedSeconds}
        hasConnectionIssue={
          !isDemoMode &&
          (streamer.connectionStatus === "error" ||
            streamer.connectionStatus === "reconnecting")
        }
        mode={activeMode}
        onSelectMode={setActiveMode}
        sessionLifecycle={sessionLifecycle}
      />



      {activeMode === "interview" && (
        <>
          <ResumeUploadPanel resumeRag={resumeRag} />
          <ResumeQuestionPanel
            isPracticeActive={isPracticeActive}
            resume={resumeRag.selectedResume}
            questions={questions}
            history={history}
            generatedQuestions={generatedQuestions}
            currentQuestionIndex={currentQuestionIndex}
            targetRole={targetRole}
            setTargetRole={setTargetRole}
            interviewType={interviewType}
            setInterviewType={setInterviewType}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            count={count}
            setCount={setCount}
            focus={focus}
            setFocus={setFocus}
            handlePractice={handlePractice}
            handleGenerate={handleGenerate}
          />
        </>
      )}

      {activeMode !== "interview" && (
        <PracticePromptPanel
          activeMode={activeMode}
          isPracticeActive={isPracticeActive}
        />
      )}

      {/* Main dashboard grid: webcam + current question */}
      <div className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="order-2 xl:order-1">
          <WebcamPreview
            overlay={<MediaPipeOverlay tracking={tracking} />}
            videoRef={videoRef}
            webcam={webcam}
            microphone={microphone}
            isPracticeActive={isPracticeActive}
            onTogglePractice={handleTogglePractice}
            onStopAll={handleStopAll}
            onResetMetrics={handleResetMetrics}
            onClearTranscript={handleClearTranscript}
            sessionLifecycle={sessionLifecycle}
          />
        </div>
        <div className="order-1 xl:order-2">
          <CurrentQuestionPanel
            selectedPrompt={selectedPrompt}
            onClearQuestion={handleClearQuestion}
            isPracticeActive={isPracticeActive}
            hasResume={Boolean(resumeRag.selectedResume)}
            generatedQuestions={generatedQuestions}
            currentQuestionIndex={currentQuestionIndex}
            onNextQuestion={handleNextQuestion}
            onPreviousQuestion={handlePreviousQuestion}
            onRegenerate={handleGenerate}
            isQuestionQueueEnded={isQuestionQueueEnded}
            onEndQueue={handleEndQueue}
          />
        </div>
      </div>

      {/* Signal diagnostics collapsible panel */}
      <SignalDiagnosticsPanel
        microphone={microphone}
        streamer={streamer}
        tracking={tracking}
        transcript={liveTranscript}
        webcam={webcam}
      />

      {/* Score-style live signals */}
      <LiveSignalGrid metrics={currentMetrics} />

      {/* Deterministic scoring foundation */}
      {shouldShowCommunicationScore ? (
        <ScoreBreakdownPanel
          lastUpdatedAt={scoring.lastUpdatedAt}
          snapshot={currentScoringSnapshot}
        />
      ) : (
        <ScorePendingCard />
      )}

      <CoachingReportPanel
        canGenerate={currentCoachingCanGenerate}
        error={coachingReport.error}
        onClear={coachingReport.resetReport}
        onGenerate={() => void coachingReport.generateReport()}
        readinessMessage={coachingReport.readinessMessage}
        report={currentCoachingReport}
        status={currentCoachingStatus}
      />

      <RetryComparisonPanel
        activeAttemptLabel={currentActiveAttemptLabel}
        baselineAttempt={retryComparison.baselineAttempt}
        canSaveCurrent={hasCurrentAttemptSignal}
        comparison={currentRetryComparison}
        currentHasReport={Boolean(currentCoachingReport)}
        onClearComparison={retryComparison.clearComparison}
        onSaveBaseline={handleSaveBaseline}
        onSaveRetry={handleSaveRetry}
        onStartRetry={handleStartRetry}
        retryAttempt={retryComparison.retryAttempt}
        status={retryComparison.status}
      />

      <SaveSessionPanel
        coachingReport={currentCoachingReport}
        durationSeconds={currentMetrics.elapsedSeconds}
        finalSegments={persistedTranscriptSegments}
        metrics={currentMetrics}
        mode={activeMode}
        retryComparison={currentRetryComparison}
        scoreSnapshot={currentScoringSnapshot}
        selectedPrompt={selectedPrompt}
        transcript={transcriptText}
      />

      {/* Trends + Transcript */}
      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <LiveTranscriptPanel
          onClear={handleClearTranscript}
          transcript={{
            ...liveTranscript,
            fullTranscript: isDemoMode ? demoTranscriptText : liveTranscript.fullTranscript,
            finalSegments: isDemoMode ? demoTranscriptSegments : liveTranscript.finalSegments,
          }}
        />
        <RealtimeChartCard
          audioLevel={isDemoMode ? 0.35 : microphone.audioLevel}
          isCollecting={isChartCollecting}
          metrics={currentMetrics}
        />
      </div>

      {/* Full metrics breakdown */}
      <RealtimeMetricsPanel metrics={currentMetrics} onReset={handleResetMetrics} />

      {/* Collapsible developer diagnostics — dev builds only.
          Hidden from normal users so model/provider/debug metadata never surfaces. */}
      {import.meta.env.DEV && (
      <DeveloperDiagnostics
        expanded={showDevDiagnostics}
        onToggle={() => setShowDevDiagnostics((v) => !v)}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <WebcamDiagnostics webcam={webcam} />
          <TrackingDiagnostics isCameraActive={webcam.isActive} tracking={tracking} />
          <MicrophonePanel microphone={microphone} streamer={streamer} />
          <AudioDiagnostics microphone={microphone} streamer={streamer} />
        </div>

        {/* Advanced camera device controls (moved from WebcamPreview) */}
        <div className="flex flex-wrap gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <p className="w-full text-[11px] font-mono font-medium uppercase tracking-[0.14em] text-zinc-500">Advanced camera</p>
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            disabled={webcam.isStarting}
            onClick={() => webcam.resetDevice()}
            type="button"
          >
            Reset camera device
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            disabled={webcam.isStarting}
            onClick={() => webcam.loadDevices()}
            type="button"
          >
            Reload devices
          </button>
        </div>

        <RealtimeStatusPanel
          canPing={Boolean(connectionRef.current)}
          lastMessage={lastMessage}
          onConnect={connect}
          onDisconnect={disconnect}
          onPing={sendPing}
          status={websocketStatus}
        />
        <CoachingDevPanel
          metrics={currentMetrics}
          mode={activeMode}
          scoreSnapshot={currentScoringSnapshot}
          transcript={transcriptText}
        />
      </DeveloperDiagnostics>
      )}
    </section>
  );
}

// â”€â”€ Collapsible developer diagnostics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type DeveloperDiagnosticsProps = {
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function DeveloperDiagnostics({
  expanded,
  onToggle,
  children,
}: DeveloperDiagnosticsProps) {
  return (
    <section className="rounded-md border border-line-2 bg-bg-2">
      <button
        aria-controls="developer-diagnostics-panel"
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 rounded-md px-5 py-3 text-left transition hover:bg-bg-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        onClick={onToggle}
        type="button"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-bg-3 text-ink-2">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[13px] font-medium text-ink-1">Diagnostics</p>
            <p className="text-[11px] text-ink-3">Camera, MediaPipe, audio, WebSocket.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-3">
          {expanded ? "Hide" : "Show"}
          {expanded ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
      </button>

      <motion.div
        animate={{
          height: expanded ? "auto" : 0,
          opacity: expanded ? 1 : 0,
        }}
        className={cn("overflow-hidden", expanded ? "" : "pointer-events-none")}
        id="developer-diagnostics-panel"
        initial={false}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="space-y-4 border-t border-line-1 p-5">{children}</div>
      </motion.div>
    </section>
  );
}

import type { RealtimeMetrics } from "../hooks/useRealtimeMetrics";
import type { ScoreSnapshot } from "../lib/scoring";
import type { CoachingReportOutput } from "../lib/api";
import type { TranscriptSegment } from "../hooks/useLiveTranscript";
import type { RetryComparison } from "../lib/comparison";
import type { SavedPracticeSessionSummary } from "../lib/api";

export const demoTranscriptText =
  "Hello everyone, I'm thrilled to be here today to introduce PitchPilot AI. As many of you know, public speaking can be incredibly daunting. In fact, it's one of the top fears for professionals worldwide. Our team has built a solution that runs entirely in your browser using local AI to give you real-time feedback on your delivery. By analyzing your pacing, your filler words, and your body language, PitchPilot helps you become a more confident and effective speaker. We believe this is the future of coaching.";

export const demoTranscriptSegments: TranscriptSegment[] = [
  { id: 1, text: "Hello everyone, I'm thrilled to be here today to introduce PitchPilot AI.", confidence: 0.98, startMs: 0, endMs: 4000, provider: "mock", isFinal: true },
  { id: 2, text: "As many of you know, public speaking can be incredibly daunting.", confidence: 0.95, startMs: 4500, endMs: 8000, provider: "mock", isFinal: true },
  { id: 3, text: "In fact, it's one of the top fears for professionals worldwide.", confidence: 0.96, startMs: 8500, endMs: 12000, provider: "mock", isFinal: true },
  { id: 4, text: "Our team has built a solution that runs entirely in your browser using local AI to give you real-time feedback on your delivery.", confidence: 0.97, startMs: 12500, endMs: 20000, provider: "mock", isFinal: true },
  { id: 5, text: "By analyzing your pacing, your filler words, and your body language, PitchPilot helps you become a more confident and effective speaker.", confidence: 0.94, startMs: 20500, endMs: 28000, provider: "mock", isFinal: true },
  { id: 6, text: "We believe this is the future of coaching.", confidence: 0.99, startMs: 28500, endMs: 31000, provider: "mock", isFinal: true },
];

export const demoMetrics: RealtimeMetrics = {
  startedAt: Date.now() - 35000,
  elapsedSeconds: 35,
  wordCount: 86,
  wordsPerMinute: 147,
  paceStatus: "good",
  fillerWordCount: 2,
  fillerRate: 2.3,
  fillerBreakdown: {
    total: 2,
    byWord: { "um": 1, "like": 1 },
  },
  topFillers: [
    { word: "um", count: 1 },
    { word: "like", count: 1 }
  ],
  pauseCount: 4,
  currentPauseSeconds: 0,
  longestPauseSeconds: 1.8,
  speakingSeconds: 28,
  silenceSeconds: 7,
  faceVisiblePercent: 95,
  cameraFacingPercent: 88,
  postureSignal: "upright",
  engagementSignal: "strong",
  metricsStatus: "ready",
};

export const demoScoreSnapshot: ScoreSnapshot = {
  status: "ready",
  label: "Strong",
  breakdown: { overall: 88, clarity: 90, pace: 85, delivery: 92, engagement: 88, eyeContact: 95 },
  reasons: [],
  improvementHints: [],
  generatedAt: Date.now(),
  metricsSummary: { elapsedSeconds: 35, wordCount: 86, wordsPerMinute: 147, fillerRate: 2.3, pauseCount: 4, faceVisiblePercent: 95, cameraFacingPercent: 88 }
};

export const demoCoachingReport: CoachingReportOutput = {
  provider: "mock",
  model: "mock-model",
  reportId: "demo-report-1",
  generatedAt: new Date().toISOString(),
  mode: "startup_pitch",
  summary: "A very strong pitch with excellent pacing.",
  overallAssessment: "Great job maintaining eye contact and clear delivery.",
  strengths: [
    "Excellent pacing throughout the pitch, falling perfectly into the optimal speaking rate.",
    "Strong eye contact and upright posture convey high confidence and authority.",
    "Very few filler words used, making your delivery sound polished and professional."
  ],
  improvementAreas: [
    "You could incorporate slightly longer pauses between key points to let them sink in.",
    "The vocabulary used is great, but adding a brief personal anecdote might increase emotional resonance."
  ],
  nextPracticeFocus: [
    "Focus on utilizing strategic pauses after dropping key statistics or impactful statements to maximize audience retention."
  ],
  rewrittenAnswer: "Here is a refined version...",
  transcriptHighlights: [],
  scoreSummary: {
    overallScore: 88,
    clarity: 90,
    pace: 85,
    delivery: 92,
    engagement: 88,
    cameraFacing: 95,
    label: "Strong"
  },
  confidenceLabel: "high",
  safetyNote: "",
};

export const demoRetryComparison: RetryComparison = {
  baselineId: "demo-attempt-0",
  retryId: "demo-attempt-1",
  comparedAt: new Date().toISOString(),
  scoreDelta: 10,
  categoryScoreDeltas: {
    clarity: 5,
    pace: 2,
    delivery: 12,
    engagement: 8,
    cameraFacing: 10,
  },
  wpmDelta: -10,
  wpmTargetDistanceDelta: 0,
  fillerDelta: -3,
  fillerRateDelta: -2.5,
  pauseDelta: 1,
  longestPauseDelta: 0.2,
  cameraFacingDelta: 15,
  faceVisibleDelta: 10,
  engagementChanged: {
    from: "steady",
    to: "strong",
    delta: 1,
    classification: "improved"
  },
  transcriptWordDelta: 5,
  improvedAreas: ["Delivery score +12pts", "Camera-facing score +10pts", "Filler words -3"],
  worsenedAreas: [],
  steadyAreas: ["Pace score +2pts"],
  summary: "Retry improved overall by +10pts. Biggest gain: Delivery score +12pts.",
};

export const demoDashboardSessions: SavedPracticeSessionSummary[] = [
  {
    id: "demo-session-3",
    title: "[Demo] Perfect Pitch Example",
    mode: "pitch",
    durationSeconds: 35,
    overallScore: 88,
    clarityScore: 90,
    paceScore: 85,
    deliveryScore: 92,
    engagementScore: 88,
    cameraFacingScore: 95,
    fillerWordCount: 2,
    wordsPerMinute: 147,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    selectedPromptText: null,
    selectedPromptSource: null,
    resumeId: null,
    questionId: null,
  },
  {
    id: "demo-session-2",
    title: "[Demo] Class Presentation",
    mode: "presentation",
    durationSeconds: 120,
    overallScore: 75,
    clarityScore: 70,
    paceScore: 80,
    deliveryScore: 75,
    engagementScore: 70,
    cameraFacingScore: 80,
    fillerWordCount: 12,
    wordsPerMinute: 125,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    selectedPromptText: null,
    selectedPromptSource: null,
    resumeId: null,
    questionId: null,
  },
  {
    id: "demo-session-1",
    title: "[Demo] First Try",
    mode: "pitch",
    durationSeconds: 45,
    overallScore: 65,
    clarityScore: 60,
    paceScore: 50,
    deliveryScore: 65,
    engagementScore: 60,
    cameraFacingScore: 70,
    fillerWordCount: 15,
    wordsPerMinute: 160,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
    selectedPromptText: null,
    selectedPromptSource: null,
    resumeId: null,
    questionId: null,
  }
];

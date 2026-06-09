import { useAppStore } from "../app/store";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type HealthResponse = {
  status: string;
  service: string;
  version: string;
};

export type AuthenticatedUserResponse = {
  authenticated: boolean;
  user: {
    id: string;
    email: string | null;
    role: string | null;
    claims: Record<string, unknown>;
  };
};

export type CoachingMode =
  | "interview"
  | "startup_pitch"
  | "presentation"
  | "elevator_pitch"
  | "custom";

export type CoachingStatusResponse = {
  providerConfigured: "auto" | "mock" | "openai" | "gemini";
  effectiveProvider: "openai" | "gemini" | "mock" | "unavailable";
  openaiConfigured: boolean;
  geminiConfigured: boolean;
  mockAvailable: boolean;
  fallbackEnabled: boolean;
  timeoutSeconds: number;
  openaiModel: string;
  geminiModel: string;
  reportSupported: boolean;
};

export type PracticePromptContextPayload = {
  text: string;
  source: "resume_question" | "manual";
  resumeId?: string | null;
  resumeLabel?: string | null;
  questionId?: string | null;
  category?: string | null;
  difficulty?: string | null;
  questionSource?: "resume" | "general" | "mock" | null;
  groundedIn?: string[];
  resumeChunkIds?: string[];
  suggestedAnswerAngle?: string | null;
};

export type CoachingDraftInput = {
  transcript: string;
  mode: CoachingMode;
  metrics: Record<string, unknown>;
  scoreSnapshot: Record<string, unknown>;
  userGoal?: string;
  prompt?: string;
  promptContext?: PracticePromptContextPayload | null;
  durationSeconds?: number;
};

export type CoachingDraftOutput = {
  provider: "openai" | "gemini" | "mock";
  model: string;
  summary: string;
  strengths: string[];
  improvementAreas: string[];
  nextPracticeFocus: string[];
  confidenceLabel: "low" | "medium" | "high";
  safetyNote?: string | null;
  generatedAt: string;
};

export type CoachingReportInput = CoachingDraftInput & {
  finalTranscriptSegments?: Array<{
    text: string;
    confidence?: number | null;
    startMs?: number | null;
    endMs?: number | null;
  }>;
  interimText?: string;
  generatedFrom?: "current_session" | "manual";
};

export type TranscriptHighlight = {
  quote: string;
  note: string;
  type: "strength" | "improvement" | "filler" | "clarity" | "delivery";
};

export type CoachingScoreSummary = {
  overallScore: number;
  clarity: number;
  pace: number;
  delivery: number;
  engagement: number;
  cameraFacing: number;
  label: string;
};

export type CoachingReportOutput = {
  provider: "openai" | "gemini" | "mock";
  model: string;
  reportId?: string | null;
  generatedAt: string;
  mode: CoachingMode;
  summary: string;
  overallAssessment: string;
  strengths: string[];
  improvementAreas: string[];
  nextPracticeFocus: string[];
  rewrittenAnswer: string;
  transcriptHighlights: TranscriptHighlight[];
  scoreSummary: CoachingScoreSummary;
  confidenceLabel: "low" | "medium" | "high";
  safetyNote: string;
};

export type SavePracticeSessionPayload = {
  mode: string;
  title?: string | null;
  durationSeconds: number;
  transcript: string;
  finalSegments: Array<Record<string, unknown>>;
  metrics: Record<string, unknown>;
  scoreSnapshot: Record<string, unknown>;
  coachingReport?: Record<string, unknown> | null;
  retryComparison?: Record<string, unknown> | null;
  selectedPrompt?: PracticePromptContextPayload | null;
};

export type SavedPracticeSessionSummary = {
  id: string;
  mode: string;
  title: string | null;
  durationSeconds: number;
  overallScore: number | null;
  clarityScore: number | null;
  paceScore: number | null;
  deliveryScore: number | null;
  engagementScore: number | null;
  cameraFacingScore: number | null;
  fillerWordCount: number;
  wordsPerMinute: number | null;
  createdAt: string;
  updatedAt: string | null;
  selectedPromptText: string | null;
  selectedPromptSource: string | null;
  resumeId: string | null;
  questionId: string | null;
};

export type SavedPracticeSessionDetail = SavedPracticeSessionSummary & {
  transcript: {
    fullTranscript: string;
    finalSegments: Array<Record<string, unknown>>;
    wordCount: number;
  };
  metrics: Record<string, unknown>;
  scoreSnapshot: Record<string, unknown>;
  coachingReport: Record<string, unknown> | null;
  retryComparison: Record<string, unknown> | null;
  selectedPromptMetadata: Record<string, unknown> | null;
};

export type SavedSessionsListResponse = {
  sessions: SavedPracticeSessionSummary[];
};

export type ResumeDocumentSummary = {
  id: string;
  filename: string;
  fileType: string;
  fileSizeBytes: number | null;
  textCharCount: number;
  chunkCount: number;
  embeddingModel: string;
  status: string;
  createdAt: string;
};

export type ResumeChunkPreview = {
  id: string;
  chunkIndex: number;
  content: string;
  contentCharCount: number;
  metadata: Record<string, unknown>;
};

export type ResumeDocumentDetail = ResumeDocumentSummary & {
  previewText: string | null;
  chunksPreview: ResumeChunkPreview[];
};

export type ResumeUploadResponse = {
  document: ResumeDocumentSummary;
  message: string;
  warnings: string[];
};

export type ResumeListResponse = {
  resumes: ResumeDocumentSummary[];
};

export type ResumeStatusResponse = {
  enabled: boolean;
  embeddingModel: string;
  embeddingDimension: number;
  allowedFileTypes: string[];
  maxFileSizeMb: number;
  supabaseConfigured: boolean;
  vectorStoreExpected: boolean;
};

export type ResumeInterviewType =
  | "behavioral"
  | "technical"
  | "project"
  | "startup"
  | "general";

export type ResumeQuestionDifficulty = "easy" | "medium" | "hard";

export type ResumeQuestionSource = "resume" | "general" | "mock";

export type ResumeQuestionProvider = "openai" | "gemini" | "mock";

export type ResumeQuestion = {
  id: string;
  question: string;
  category: string;
  difficulty: ResumeQuestionDifficulty;
  source: ResumeQuestionSource;
  groundedIn: string[];
  suggestedAnswerAngle: string | null;
  resumeChunkIds: string[];
  isPersisted?: boolean;
  isFavorite?: boolean;
  practicedCount?: number;
  lastPracticedAt?: string | null;
  createdAt?: string | null;
  targetRole?: string | null;
  focus?: string | null;
  resumeLabel?: string | null;
};

export type ResumeQuestionGenerateRequest = {
  targetRole?: string | null;
  interviewType: ResumeInterviewType;
  difficulty: ResumeQuestionDifficulty;
  count: number;
  focus?: string | null;
  save?: boolean;
};

export type ResumeQuestionGenerateResponse = {
  resumeId: string;
  provider: ResumeQuestionProvider;
  model: string;
  questions: ResumeQuestion[];
  retrievedChunkCount: number;
  retrievalMethod: "rpc" | "python_fallback";
  generatedAt: string;
  warnings: string[];
};

export type ResumeQuestionHistoryListResponse = {
  resumeId: string;
  questions: ResumeQuestion[];
};

export type ResumeQuestionHistoryUpdateRequest = {
  isFavorite?: boolean;
  markPracticed?: boolean;
};

export type ResumeRetrievalPreviewItem = {
  id: string;
  chunkIndex: number;
  contentPreview: string;
  similarity: number | null;
  distance: number | null;
};

export type ResumeRetrievalPreviewResponse = {
  resumeId: string;
  query: string;
  method: "rpc" | "python_fallback";
  chunks: ResumeRetrievalPreviewItem[];
};

export type ApiErrorCode =
  | "network_offline"
  | "service_unavailable"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "bad_request"
  | "server_error"
  | "unknown";

export type ApiResult<T> =
  | { data: T; error: null; errorCode?: undefined }
  | { data: null; error: string; errorCode: ApiErrorCode };

const BACKEND_OFFLINE_MESSAGE =
  "Backend is unavailable. Please start the backend server.";

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("load failed") ||
      message.includes("network request failed")
    );
  }
  return false;
}

function networkErrorResult<T>(): ApiResult<T> {
  return {
    data: null,
    error: BACKEND_OFFLINE_MESSAGE,
    errorCode: "network_offline",
  };
}

function statusErrorCode(status: number): ApiErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 400) return "bad_request";
  if (status === 503) return "service_unavailable";
  if (status >= 500) return "server_error";
  return "unknown";
}

function fallbackErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function getHealth(): Promise<ApiResult<HealthResponse>> {
  try {
    const response = await fetch(`${API_URL}/health`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return {
        data: null,
        error: `Health check failed with status ${response.status}`,
        errorCode: statusErrorCode(response.status),
      };
    }

    const data = (await response.json()) as HealthResponse;
    return { data, error: null };
  } catch (error) {
    if (isNetworkError(error)) return networkErrorResult<HealthResponse>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to reach the PitchPilot API"),
      errorCode: "unknown",
    };
  }
}

export type DiagnosticsResponse = {
  api: string;
  websocket: string;
  auth: string;
  ai_providers: Record<string, string>;
  database: string;
  resume_rag?: Record<string, string>;
  environment: string;
};

export async function getDiagnostics(): Promise<ApiResult<DiagnosticsResponse>> {
  try {
    const response = await fetch(`${API_URL}/api/diagnostics`, {
      headers: { Accept: "application/json" },
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: extractApiError(data, `Diagnostics failed with status ${response.status}`),
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as DiagnosticsResponse, error: null };
  } catch (error) {
    if (isNetworkError(error)) return networkErrorResult<DiagnosticsResponse>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to reach diagnostics endpoint"),
      errorCode: "unknown",
    };
  }
}

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { auth = false, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  if (auth) {
    const token = useAppStore.getState().session?.access_token;

    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  return fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers: requestHeaders,
  });
}

export async function getMe(): Promise<ApiResult<AuthenticatedUserResponse>> {
  try {
    const response = await apiFetch("/api/auth/me", { auth: true });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error:
          typeof data?.detail === "string"
            ? data.detail
            : `Auth check failed with status ${response.status}`,
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as AuthenticatedUserResponse, error: null };
  } catch (error) {
    if (isNetworkError(error)) return networkErrorResult<AuthenticatedUserResponse>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to reach the PitchPilot API"),
      errorCode: "unknown",
    };
  }
}

export async function getCoachingStatus(): Promise<ApiResult<CoachingStatusResponse>> {
  try {
    const response = await apiFetch("/api/coaching/status");
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error:
          typeof data?.detail === "string"
            ? data.detail
            : `Coaching status failed with status ${response.status}`,
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as CoachingStatusResponse, error: null };
  } catch (error) {
    if (isNetworkError(error)) return networkErrorResult<CoachingStatusResponse>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to reach the coaching status endpoint"),
      errorCode: "unknown",
    };
  }
}

export async function generateCoachingDraft(
  input: CoachingDraftInput,
): Promise<ApiResult<CoachingDraftOutput>> {
  try {
    const response = await apiFetch("/api/coaching/draft", {
      auth: true,
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = data?.detail;
      const message =
        typeof detail?.message === "string"
          ? detail.message
          : typeof detail === "string"
            ? detail
            : `Coaching draft failed with status ${response.status}`;
      return { data: null, error: message, errorCode: statusErrorCode(response.status) };
    }

    return { data: data as CoachingDraftOutput, error: null };
  } catch (error) {
    if (isNetworkError(error)) return networkErrorResult<CoachingDraftOutput>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to generate a coaching draft"),
      errorCode: "unknown",
    };
  }
}

export async function generateCoachingReport(
  input: CoachingReportInput,
): Promise<ApiResult<CoachingReportOutput>> {
  try {
    const response = await apiFetch("/api/coaching/report", {
      auth: true,
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = data?.detail;
      const message =
        typeof detail?.message === "string"
          ? detail.message
          : typeof detail === "string"
            ? detail
            : `Coaching report failed with status ${response.status}`;
      return { data: null, error: message, errorCode: statusErrorCode(response.status) };
    }

    return { data: data as CoachingReportOutput, error: null };
  } catch (error) {
    if (isNetworkError(error)) return networkErrorResult<CoachingReportOutput>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to generate a coaching report"),
      errorCode: "unknown",
    };
  }
}

export async function savePracticeSession(
  input: SavePracticeSessionPayload,
): Promise<ApiResult<SavedPracticeSessionDetail>> {
  try {
    const response = await apiFetch("/api/sessions", {
      auth: true,
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: extractApiError(data, `Save session failed with status ${response.status}`),
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as SavedPracticeSessionDetail, error: null };
  } catch (error) {
    if (isNetworkError(error)) return networkErrorResult<SavedPracticeSessionDetail>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to save the practice session"),
      errorCode: "unknown",
    };
  }
}

export async function listPracticeSessions(
  limit = 20,
): Promise<ApiResult<SavedSessionsListResponse>> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await apiFetch(`/api/sessions?${params.toString()}`, {
      auth: true,
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: extractApiError(data, `List sessions failed with status ${response.status}`),
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as SavedSessionsListResponse, error: null };
  } catch (error) {
    if (isNetworkError(error)) return networkErrorResult<SavedSessionsListResponse>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to load saved sessions"),
      errorCode: "unknown",
    };
  }
}

export async function getPracticeSession(
  sessionId: string,
): Promise<ApiResult<SavedPracticeSessionDetail>> {
  try {
    const response = await apiFetch(`/api/sessions/${sessionId}`, {
      auth: true,
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: extractApiError(data, `Load session failed with status ${response.status}`),
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as SavedPracticeSessionDetail, error: null };
  } catch (error) {
    if (isNetworkError(error)) return networkErrorResult<SavedPracticeSessionDetail>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to load the saved session"),
      errorCode: "unknown",
    };
  }
}

export async function deletePracticeSession(
  sessionId: string,
): Promise<ApiResult<{ deleted: boolean; id: string }>> {
  try {
    const response = await apiFetch(`/api/sessions/${sessionId}`, {
      auth: true,
      method: "DELETE",
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: extractApiError(data, `Delete session failed with status ${response.status}`),
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as { deleted: boolean; id: string }, error: null };
  } catch (error) {
    if (isNetworkError(error)) return networkErrorResult<{ deleted: boolean; id: string }>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to delete the saved session"),
      errorCode: "unknown",
    };
  }
}

export async function getResumeRagStatus(): Promise<ApiResult<ResumeStatusResponse>> {
  try {
    const response = await apiFetch("/api/resumes/status");
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: extractApiError(data, `Resume RAG status failed with status ${response.status}`),
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as ResumeStatusResponse, error: null };
  } catch (error) {
    if (isNetworkError(error)) return networkErrorResult<ResumeStatusResponse>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to load resume RAG status"),
      errorCode: "unknown",
    };
  }
}

export async function uploadResume(
  file: File,
): Promise<ApiResult<ResumeUploadResponse>> {
  try {
    const body = new FormData();
    body.append("file", file);
    const response = await apiFetch("/api/resumes/upload", {
      auth: true,
      body,
      method: "POST",
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: extractApiError(data, `Resume upload failed with status ${response.status}`),
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as ResumeUploadResponse, error: null };
  } catch (error) {
    if (isNetworkError(error)) return networkErrorResult<ResumeUploadResponse>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to upload resume"),
      errorCode: "unknown",
    };
  }
}

export async function listResumes(): Promise<ApiResult<ResumeListResponse>> {
  try {
    const response = await apiFetch("/api/resumes", { auth: true });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: extractApiError(data, `List resumes failed with status ${response.status}`),
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as ResumeListResponse, error: null };
  } catch (error) {
    if (isNetworkError(error)) return networkErrorResult<ResumeListResponse>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to load resumes"),
      errorCode: "unknown",
    };
  }
}

export async function getResume(
  resumeId: string,
): Promise<ApiResult<ResumeDocumentDetail>> {
  try {
    const response = await apiFetch(`/api/resumes/${resumeId}`, {
      auth: true,
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: extractApiError(data, `Load resume failed with status ${response.status}`),
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as ResumeDocumentDetail, error: null };
  } catch (error) {
    if (isNetworkError(error)) return networkErrorResult<ResumeDocumentDetail>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to load resume"),
      errorCode: "unknown",
    };
  }
}

export async function generateResumeQuestions(
  resumeId: string,
  input: ResumeQuestionGenerateRequest,
): Promise<ApiResult<ResumeQuestionGenerateResponse>> {
  try {
    const response = await apiFetch(
      `/api/resumes/${resumeId}/questions/generate`,
      {
        auth: true,
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: extractApiError(
          data,
          `Resume question generation failed with status ${response.status}`,
        ),
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as ResumeQuestionGenerateResponse, error: null };
  } catch (error) {
    if (isNetworkError(error))
      return networkErrorResult<ResumeQuestionGenerateResponse>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to generate resume questions"),
      errorCode: "unknown",
    };
  }
}

export async function listResumeQuestions(
  resumeId: string,
): Promise<ApiResult<ResumeQuestionHistoryListResponse>> {
  try {
    const response = await apiFetch(`/api/resumes/${resumeId}/questions`, {
      auth: true,
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: extractApiError(
          data,
          `Resume question history failed with status ${response.status}`,
        ),
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as ResumeQuestionHistoryListResponse, error: null };
  } catch (error) {
    if (isNetworkError(error))
      return networkErrorResult<ResumeQuestionHistoryListResponse>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to load saved resume questions"),
      errorCode: "unknown",
    };
  }
}

export async function updateResumeQuestion(
  resumeId: string,
  questionId: string,
  input: ResumeQuestionHistoryUpdateRequest,
): Promise<ApiResult<ResumeQuestion>> {
  try {
    const response = await apiFetch(
      `/api/resumes/${resumeId}/questions/${questionId}`,
      {
        auth: true,
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      },
    );
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: extractApiError(
          data,
          `Resume question update failed with status ${response.status}`,
        ),
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as ResumeQuestion, error: null };
  } catch (error) {
    if (isNetworkError(error)) return networkErrorResult<ResumeQuestion>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to update resume question"),
      errorCode: "unknown",
    };
  }
}

export async function deleteResumeQuestion(
  resumeId: string,
  questionId: string,
): Promise<ApiResult<{ deleted: boolean; id: string }>> {
  try {
    const response = await apiFetch(
      `/api/resumes/${resumeId}/questions/${questionId}`,
      {
        auth: true,
        method: "DELETE",
      },
    );
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: extractApiError(
          data,
          `Resume question delete failed with status ${response.status}`,
        ),
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as { deleted: boolean; id: string }, error: null };
  } catch (error) {
    if (isNetworkError(error))
      return networkErrorResult<{ deleted: boolean; id: string }>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to delete resume question"),
      errorCode: "unknown",
    };
  }
}

export async function getResumeRetrievalPreview(
  resumeId: string,
  query: string,
  limit = 5,
): Promise<ApiResult<ResumeRetrievalPreviewResponse>> {
  try {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const response = await apiFetch(
      `/api/resumes/${resumeId}/retrieval-preview?${params.toString()}`,
      { auth: true },
    );
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: extractApiError(
          data,
          `Resume retrieval preview failed with status ${response.status}`,
        ),
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as ResumeRetrievalPreviewResponse, error: null };
  } catch (error) {
    if (isNetworkError(error))
      return networkErrorResult<ResumeRetrievalPreviewResponse>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to load retrieval preview"),
      errorCode: "unknown",
    };
  }
}

export async function deleteResume(
  resumeId: string,
): Promise<ApiResult<{ deleted: boolean; id: string }>> {
  try {
    const response = await apiFetch(`/api/resumes/${resumeId}`, {
      auth: true,
      method: "DELETE",
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: extractApiError(data, `Delete resume failed with status ${response.status}`),
        errorCode: statusErrorCode(response.status),
      };
    }

    return { data: data as { deleted: boolean; id: string }, error: null };
  } catch (error) {
    if (isNetworkError(error)) return networkErrorResult<{ deleted: boolean; id: string }>();
    return {
      data: null,
      error: fallbackErrorMessage(error, "Unable to delete resume"),
      errorCode: "unknown",
    };
  }
}

function extractApiError(data: unknown, fallback: string): string {
  if (
    data &&
    typeof data === "object" &&
    "detail" in data
  ) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return "Request validation failed. Check the inputs and try again.";
    }
    if (
      detail &&
      typeof detail === "object" &&
      "message" in detail &&
      typeof (detail as { message?: unknown }).message === "string"
    ) {
      return (detail as { message: string }).message;
    }
  }

  return fallback;
}

export { API_URL };

import { useCallback, useState } from "react";
import {
  deletePracticeSession,
  getPracticeSession,
  listPracticeSessions,
  savePracticeSession,
  type ApiErrorCode,
  type SavePracticeSessionPayload,
  type SavedPracticeSessionDetail,
  type SavedPracticeSessionSummary,
} from "../lib/api";

export type SaveSessionStatus = "idle" | "saving" | "saved" | "error";
export type LoadSessionsStatus = "idle" | "loading" | "loaded" | "error";

export type UseSessionPersistenceResult = {
  saveStatus: SaveSessionStatus;
  loadStatus: LoadSessionsStatus;
  lastSavedSession: SavedPracticeSessionDetail | null;
  selectedSession: SavedPracticeSessionDetail | null;
  savedSessions: SavedPracticeSessionSummary[];
  error: string | null;
  errorCode: ApiErrorCode | null;
  saveSession: (payload: SavePracticeSessionPayload) => Promise<SavedPracticeSessionDetail | null>;
  loadSessions: () => Promise<SavedPracticeSessionSummary[]>;
  loadSession: (sessionId: string) => Promise<SavedPracticeSessionDetail | null>;
  deleteSession: (sessionId: string) => Promise<boolean>;
  clearError: () => void;
};

export function useSessionPersistence(): UseSessionPersistenceResult {
  const [saveStatus, setSaveStatus] = useState<SaveSessionStatus>("idle");
  const [loadStatus, setLoadStatus] = useState<LoadSessionsStatus>("idle");
  const [lastSavedSession, setLastSavedSession] =
    useState<SavedPracticeSessionDetail | null>(null);
  const [selectedSession, setSelectedSession] =
    useState<SavedPracticeSessionDetail | null>(null);
  const [savedSessions, setSavedSessions] = useState<SavedPracticeSessionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);

  const resetError = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);

  const loadSessions = useCallback(async () => {
    setLoadStatus("loading");
    resetError();
    const result = await listPracticeSessions();

    if (result.error || !result.data) {
      setLoadStatus("error");
      setError(result.error ?? "Unable to load saved sessions");
      setErrorCode(result.errorCode ?? "unknown");
      return [];
    }

    const sessions = result.data.sessions;
    setSavedSessions(sessions);
    setLoadStatus("loaded");
    return sessions;
  }, [resetError]);

  const saveSession = useCallback(async (payload: SavePracticeSessionPayload) => {
    setSaveStatus("saving");
    resetError();
    const result = await savePracticeSession(payload);

    if (result.error || !result.data) {
      setSaveStatus("error");
      setError(result.error ?? "Unable to save the practice session");
      setErrorCode(result.errorCode ?? "unknown");
      return null;
    }

    const saved = result.data;
    setLastSavedSession(saved);
    setSelectedSession(saved);
    setSavedSessions((prev) => [
      saved,
      ...prev.filter((session) => session.id !== saved.id),
    ]);
    setSaveStatus("saved");
    return saved;
  }, [resetError]);

  const loadSession = useCallback(async (sessionId: string) => {
    setLoadStatus("loading");
    resetError();
    const result = await getPracticeSession(sessionId);

    if (result.error || !result.data) {
      setLoadStatus("error");
      setError(result.error ?? "Unable to load the saved session");
      setErrorCode(result.errorCode ?? "unknown");
      return null;
    }

    const session = result.data;
    setSelectedSession(session);
    setLoadStatus("loaded");
    return session;
  }, [resetError]);

  const deleteSession = useCallback(async (sessionId: string) => {
    resetError();
    const result = await deletePracticeSession(sessionId);

    if (result.error) {
      setError(result.error);
      setErrorCode(result.errorCode ?? "unknown");
      return false;
    }

    setSavedSessions((prev) => prev.filter((session) => session.id !== sessionId));
    setSelectedSession((prev) => (prev?.id === sessionId ? null : prev));
    setLastSavedSession((prev) => (prev?.id === sessionId ? null : prev));
    return true;
  }, [resetError]);

  const clearError = useCallback(() => {
    resetError();
  }, [resetError]);

  return {
    saveStatus,
    loadStatus,
    lastSavedSession,
    selectedSession,
    savedSessions,
    error,
    errorCode,
    saveSession,
    loadSessions,
    loadSession,
    deleteSession,
    clearError,
  };
}

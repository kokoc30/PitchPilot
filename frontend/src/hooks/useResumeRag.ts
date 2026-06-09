import { useCallback, useState } from "react";
import {
  deleteResume,
  getResume,
  getResumeRagStatus,
  listResumes,
  uploadResume as uploadResumeApi,
  type ResumeDocumentDetail,
  type ResumeDocumentSummary,
  type ResumeStatusResponse,
} from "../lib/api";

export type ResumeUploadStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "complete"
  | "error";

export type UseResumeRagResult = {
  status: ResumeStatusResponse | null;
  resumes: ResumeDocumentSummary[];
  selectedResume: ResumeDocumentDetail | null;
  uploadStatus: ResumeUploadStatus;
  isLoading: boolean;
  error: string | null;
  warnings: string[];
  loadStatus: () => Promise<ResumeStatusResponse | null>;
  loadResumes: () => Promise<ResumeDocumentSummary[]>;
  uploadResume: (file: File) => Promise<ResumeDocumentSummary | null>;
  selectResume: (resumeId: string) => Promise<ResumeDocumentDetail | null>;
  deleteResume: (resumeId: string) => Promise<boolean>;
  clearError: () => void;
};

export function useResumeRag(): UseResumeRagResult {
  const [status, setStatus] = useState<ResumeStatusResponse | null>(null);
  const [resumes, setResumes] = useState<ResumeDocumentSummary[]>([]);
  const [selectedResume, setSelectedResume] =
    useState<ResumeDocumentDetail | null>(null);
  const [uploadStatus, setUploadStatus] = useState<ResumeUploadStatus>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const loadStatus = useCallback(async () => {
    const result = await getResumeRagStatus();
    if (result.error || !result.data) {
      setError(result.error ?? "Unable to load resume RAG status");
      return null;
    }
    setStatus(result.data);
    return result.data;
  }, []);

  const loadResumes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await listResumes();
    setIsLoading(false);

    if (result.error || !result.data) {
      setError(result.error ?? "Unable to load resumes");
      return [];
    }

    setResumes(result.data.resumes);
    return result.data.resumes;
  }, []);

  const uploadResume = useCallback(async (file: File) => {
    setUploadStatus("uploading");
    setError(null);
    setWarnings([]);
    let settled = false;
    const processingTimer = window.setTimeout(() => {
      if (!settled) setUploadStatus("processing");
    }, 500);
    const result = await uploadResumeApi(file);
    settled = true;
    window.clearTimeout(processingTimer);

    if (result.error || !result.data) {
      setUploadStatus("error");
      setError(result.error ?? "Unable to upload resume");
      return null;
    }

    setUploadStatus("complete");
    setWarnings(result.data.warnings);
    setResumes((prev) => [
      result.data.document,
      ...prev.filter((resume) => resume.id !== result.data.document.id),
    ]);
    await loadResumes();
    return result.data.document;
  }, [loadResumes]);

  const selectResume = useCallback(async (resumeId: string) => {
    setIsLoading(true);
    setError(null);
    const result = await getResume(resumeId);
    setIsLoading(false);

    if (result.error || !result.data) {
      setError(result.error ?? "Unable to load resume");
      return null;
    }

    setSelectedResume(result.data);
    return result.data;
  }, []);

  const removeResume = useCallback(async (resumeId: string) => {
    setError(null);
    const result = await deleteResume(resumeId);

    if (result.error || !result.data) {
      setError(result.error ?? "Unable to delete resume");
      return false;
    }

    setResumes((prev) => prev.filter((resume) => resume.id !== resumeId));
    setSelectedResume((prev) => (prev?.id === resumeId ? null : prev));
    return true;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    status,
    resumes,
    selectedResume,
    uploadStatus,
    isLoading,
    error,
    warnings,
    loadStatus,
    loadResumes,
    uploadResume,
    selectResume,
    deleteResume: removeResume,
    clearError,
  };
}

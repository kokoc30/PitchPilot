import { useCallback, useState } from "react";
import {
  generateResumeQuestions,
  getResumeRetrievalPreview,
  type ResumeQuestion,
  type ResumeQuestionDifficulty,
  type ResumeQuestionGenerateRequest,
  type ResumeQuestionGenerateResponse,
  type ResumeInterviewType,
  type ResumeRetrievalPreviewResponse,
} from "../lib/api";

export type ResumeQuestionsStatus =
  | "idle"
  | "generating"
  | "ready"
  | "error";

export type UseResumeQuestionsResult = {
  status: ResumeQuestionsStatus;
  result: ResumeQuestionGenerateResponse | null;
  questions: ResumeQuestion[];
  retrievalPreview: ResumeRetrievalPreviewResponse | null;
  error: string | null;
  warnings: string[];
  generate: (
    resumeId: string,
    input: ResumeQuestionGenerateRequest,
  ) => Promise<ResumeQuestionGenerateResponse | null>;
  preview: (
    resumeId: string,
    query: string,
    limit?: number,
  ) => Promise<ResumeRetrievalPreviewResponse | null>;
  reset: () => void;
};

export const RESUME_INTERVIEW_TYPES: ResumeInterviewType[] = [
  "general",
  "behavioral",
  "technical",
  "project",
  "startup",
];

export const RESUME_DIFFICULTIES: ResumeQuestionDifficulty[] = [
  "easy",
  "medium",
  "hard",
];

export function useResumeQuestions(): UseResumeQuestionsResult {
  const [status, setStatus] = useState<ResumeQuestionsStatus>("idle");
  const [result, setResult] =
    useState<ResumeQuestionGenerateResponse | null>(null);
  const [retrievalPreview, setRetrievalPreview] =
    useState<ResumeRetrievalPreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (resumeId: string, input: ResumeQuestionGenerateRequest) => {
      setStatus("generating");
      setError(null);
      const response = await generateResumeQuestions(resumeId, input);
      if (response.error || !response.data) {
        setStatus("error");
        setError(response.error ?? "Unable to generate resume questions");
        return null;
      }
      setResult(response.data);
      setStatus("ready");
      return response.data;
    },
    [],
  );

  const preview = useCallback(
    async (resumeId: string, query: string, limit = 5) => {
      const response = await getResumeRetrievalPreview(resumeId, query, limit);
      if (response.error || !response.data) {
        setError(response.error ?? "Unable to load retrieval preview");
        return null;
      }
      setRetrievalPreview(response.data);
      return response.data;
    },
    [],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setRetrievalPreview(null);
    setError(null);
  }, []);

  return {
    status,
    result,
    questions: result?.questions ?? [],
    retrievalPreview,
    error,
    warnings: result?.warnings ?? [],
    generate,
    preview,
    reset,
  };
}

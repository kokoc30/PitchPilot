import { useCallback, useState } from "react";
import {
  deleteResumeQuestion,
  listResumeQuestions,
  updateResumeQuestion,
  type ApiErrorCode,
  type ResumeQuestion,
} from "../lib/api";

export type ResumeQuestionHistoryStatus =
  | "idle"
  | "loading"
  | "ready"
  | "updating"
  | "error";

export type UseResumeQuestionHistoryResult = {
  status: ResumeQuestionHistoryStatus;
  questions: ResumeQuestion[];
  error: string | null;
  errorCode: ApiErrorCode | null;
  load: (resumeId: string) => Promise<ResumeQuestion[]>;
  replace: (questions: ResumeQuestion[]) => void;
  updateQuestion: (
    resumeId: string,
    questionId: string,
    input: { isFavorite?: boolean; markPracticed?: boolean },
  ) => Promise<ResumeQuestion | null>;
  toggleFavorite: (
    resumeId: string,
    question: ResumeQuestion,
  ) => Promise<ResumeQuestion | null>;
  markPracticed: (
    resumeId: string,
    question: ResumeQuestion,
  ) => Promise<ResumeQuestion | null>;
  deleteQuestion: (resumeId: string, questionId: string) => Promise<boolean>;
  clearError: () => void;
};

export function useResumeQuestionHistory(): UseResumeQuestionHistoryResult {
  const [status, setStatus] = useState<ResumeQuestionHistoryStatus>("idle");
  const [questions, setQuestions] = useState<ResumeQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);

  const clearError = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);

  const load = useCallback(
    async (resumeId: string) => {
      setStatus("loading");
      clearError();
      const result = await listResumeQuestions(resumeId);

      if (result.error || !result.data) {
        setStatus("error");
        setError(result.error ?? "Unable to load saved questions");
        setErrorCode(result.errorCode ?? "unknown");
        setQuestions([]);
        return [];
      }

      setQuestions(result.data.questions);
      setStatus("ready");
      return result.data.questions;
    },
    [clearError],
  );

  const replace = useCallback((nextQuestions: ResumeQuestion[]) => {
    setQuestions(nextQuestions);
    setStatus("ready");
  }, []);

  const updateQuestion = useCallback(
    async (
      resumeId: string,
      questionId: string,
      input: { isFavorite?: boolean; markPracticed?: boolean },
    ) => {
      setStatus("updating");
      clearError();
      const result = await updateResumeQuestion(resumeId, questionId, input);

      if (result.error || !result.data) {
        setStatus("error");
        setError(result.error ?? "Unable to update question");
        setErrorCode(result.errorCode ?? "unknown");
        return null;
      }

      const updated = result.data;
      setQuestions((prev) =>
        prev.map((question) =>
          question.id === updated.id ? { ...question, ...updated } : question,
        ),
      );
      setStatus("ready");
      return updated;
    },
    [clearError],
  );

  const toggleFavorite = useCallback(
    (resumeId: string, question: ResumeQuestion) =>
      updateQuestion(resumeId, question.id, {
        isFavorite: !Boolean(question.isFavorite),
      }),
    [updateQuestion],
  );

  const markPracticed = useCallback(
    (resumeId: string, question: ResumeQuestion) =>
      updateQuestion(resumeId, question.id, { markPracticed: true }),
    [updateQuestion],
  );

  const deleteQuestion = useCallback(
    async (resumeId: string, questionId: string) => {
      setStatus("updating");
      clearError();
      const result = await deleteResumeQuestion(resumeId, questionId);

      if (result.error || !result.data) {
        setStatus("error");
        setError(result.error ?? "Unable to delete question");
        setErrorCode(result.errorCode ?? "unknown");
        return false;
      }

      setQuestions((prev) => prev.filter((question) => question.id !== questionId));
      setStatus("ready");
      return true;
    },
    [clearError],
  );

  return {
    status,
    questions,
    error,
    errorCode,
    load,
    replace,
    updateQuestion,
    toggleFavorite,
    markPracticed,
    deleteQuestion,
    clearError,
  };
}

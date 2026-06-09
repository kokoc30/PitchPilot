import { useCallback, useEffect, useMemo, useState } from "react";
import {
  compareAttempts,
  createAttemptSnapshot,
  type AttemptSnapshot,
  type CreateAttemptSnapshotInput,
  type RetryComparison,
} from "../lib/comparison";

export type RetryComparisonStatus =
  | "empty"
  | "baseline_saved"
  | "retry_saved"
  | "compared";

type RetryComparisonState = {
  baselineAttempt: AttemptSnapshot | null;
  retryAttempt: AttemptSnapshot | null;
  activeAttemptLabel: "baseline" | "retry";
};

export type RetryLabelUpdate = {
  baselineLabel?: string;
  retryLabel?: string;
};

export type UseRetryComparisonResult = RetryComparisonState & {
  comparison: RetryComparison | null;
  status: RetryComparisonStatus;
  saveBaseline: (input: Omit<CreateAttemptSnapshotInput, "label">) => void;
  saveRetry: (input: Omit<CreateAttemptSnapshotInput, "label">) => void;
  clearComparison: () => void;
  startRetry: () => void;
  updateLabels: (labels: RetryLabelUpdate) => void;
};

const STORAGE_KEY = "pitchpilot.retryComparison.v1";

const EMPTY_STATE: RetryComparisonState = {
  baselineAttempt: null,
  retryAttempt: null,
  activeAttemptLabel: "baseline",
};

export function useRetryComparison(): UseRetryComparisonResult {
  const [state, setState] = useState<RetryComparisonState>(() =>
    readStoredState(),
  );

  const comparison = useMemo(() => {
    if (!state.baselineAttempt || !state.retryAttempt) return null;
    return compareAttempts(state.baselineAttempt, state.retryAttempt);
  }, [state.baselineAttempt, state.retryAttempt]);

  const status: RetryComparisonStatus = comparison
    ? "compared"
    : state.retryAttempt
      ? "retry_saved"
      : state.baselineAttempt
        ? "baseline_saved"
        : "empty";

  useEffect(() => {
    writeStoredState(state);
  }, [state]);

  const saveBaseline = useCallback(
    (input: Omit<CreateAttemptSnapshotInput, "label">) => {
      const baselineAttempt = createAttemptSnapshot({
        ...input,
        label: "baseline",
      });
      setState({
        baselineAttempt,
        retryAttempt: null,
        activeAttemptLabel: "baseline",
      });
    },
    [],
  );

  const saveRetry = useCallback(
    (input: Omit<CreateAttemptSnapshotInput, "label">) => {
      const retryAttempt = createAttemptSnapshot({
        ...input,
        label: "retry",
      });
      setState((prev) => ({
        ...prev,
        retryAttempt,
        activeAttemptLabel: "retry",
      }));
    },
    [],
  );

  const clearComparison = useCallback(() => {
    setState(EMPTY_STATE);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const startRetry = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeAttemptLabel: "retry",
    }));
  }, []);

  const updateLabels = useCallback((labels: RetryLabelUpdate) => {
    setState((prev) => ({
      ...prev,
      baselineAttempt:
        prev.baselineAttempt && labels.baselineLabel
          ? { ...prev.baselineAttempt, label: labels.baselineLabel }
          : prev.baselineAttempt,
      retryAttempt:
        prev.retryAttempt && labels.retryLabel
          ? { ...prev.retryAttempt, label: labels.retryLabel }
          : prev.retryAttempt,
    }));
  }, []);

  return {
    ...state,
    comparison,
    status,
    saveBaseline,
    saveRetry,
    clearComparison,
    startRetry,
    updateLabels,
  };
}

function readStoredState(): RetryComparisonState {
  if (typeof window === "undefined") return EMPTY_STATE;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;

    const parsed = JSON.parse(raw) as Partial<RetryComparisonState>;
    return {
      baselineAttempt: parsed.baselineAttempt ?? null,
      retryAttempt: parsed.retryAttempt ?? null,
      activeAttemptLabel:
        parsed.activeAttemptLabel === "retry" ? "retry" : "baseline",
    };
  } catch {
    return EMPTY_STATE;
  }
}

function writeStoredState(state: RetryComparisonState) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Session storage is a convenience only; comparison still works in memory.
  }
}

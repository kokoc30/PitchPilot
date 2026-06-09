/**
 * useLiveTranscript
 *
 * Parses transcript_* WebSocket events from the audio streamer into a
 * structured state object for the LiveTranscriptPanel.
 *
 * All state updates are batched or guarded so the component only
 * re-renders when the transcript actually changes.
 */

import { useCallback, useRef, useState } from "react";
import type { RealtimeMessage } from "../lib/websocket";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TranscriptStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "transcribing"
  | "error"
  | "stopped";

export type TranscriptProvider = "deepgram" | "mock" | "none";

export type TranscriptSegment = {
  id: number;
  text: string;
  confidence: number | null;
  startMs: number | null;
  endMs: number | null;
  provider: TranscriptProvider;
  isFinal: true;
};

export type LiveTranscriptState = {
  /** Provider name reported by the backend */
  provider: TranscriptProvider;
  /** Current lifecycle status */
  status: TranscriptStatus;
  /** In-progress text (not yet committed) */
  interimText: string;
  /** Committed transcript segments */
  finalSegments: TranscriptSegment[];
  /** Convenience concatenation of all final text */
  fullTranscript: string;
  /** ISO timestamp of the most recent transcript event */
  lastTranscriptAt: string | null;
  /** Last error message from the provider */
  transcriptError: string | null;
};

export type UseLiveTranscriptResult = LiveTranscriptState & {
  /** Process one WS message — call this from the audio streamer onAck */
  handleMessage: (message: RealtimeMessage) => void;
  /** Clear all transcript state */
  clearTranscript: () => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isProvider(raw: unknown): raw is TranscriptProvider {
  return raw === "deepgram" || raw === "mock";
}

function safeProvider(raw: unknown): TranscriptProvider {
  return isProvider(raw) ? raw : "none";
}

function safeStatus(raw: unknown): TranscriptStatus {
  const valid: TranscriptStatus[] = [
    "idle",
    "connecting",
    "listening",
    "transcribing",
    "error",
    "stopped",
  ];
  return valid.includes(raw as TranscriptStatus)
    ? (raw as TranscriptStatus)
    : "idle";
}

const INITIAL_STATE: LiveTranscriptState = {
  provider: "none",
  status: "idle",
  interimText: "",
  finalSegments: [],
  fullTranscript: "",
  lastTranscriptAt: null,
  transcriptError: null,
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLiveTranscript(): UseLiveTranscriptResult {
  const segmentIdRef = useRef(0);
  const [state, setState] = useState<LiveTranscriptState>(INITIAL_STATE);

  const handleMessage = useCallback((message: RealtimeMessage) => {
    const type = message.type as string | undefined;
    if (!type?.startsWith("transcript_")) return;

    const now = new Date().toISOString();

    switch (type) {
      case "transcript_status": {
        const status = safeStatus(message.status);
        const provider = safeProvider(message.provider);
        setState((prev) => ({
          ...prev,
          status,
          provider,
          transcriptError: null,
        }));
        break;
      }

      case "transcript_interim": {
        const text = typeof message.text === "string" ? message.text : "";
        if (!text) break;
        const provider = safeProvider(message.provider);
        setState((prev) => ({
          ...prev,
          provider,
          status: "transcribing",
          interimText: text,
          lastTranscriptAt: now,
        }));
        break;
      }

      case "transcript_final": {
        const text = typeof message.text === "string" ? message.text.trim() : "";
        if (!text) break;
        const provider = safeProvider(message.provider);
        segmentIdRef.current += 1;
        const seg: TranscriptSegment = {
          id: segmentIdRef.current,
          text,
          confidence:
            typeof message.confidence === "number" ? message.confidence : null,
          startMs:
            typeof message.start_ms === "number" ? message.start_ms : null,
          endMs: typeof message.end_ms === "number" ? message.end_ms : null,
          provider,
          isFinal: true,
        };
        setState((prev) => {
          const segments = [...prev.finalSegments, seg];
          return {
            ...prev,
            provider,
            status: "listening",
            interimText: "",
            finalSegments: segments,
            fullTranscript: segments.map((s) => s.text).join(" "),
            lastTranscriptAt: now,
            transcriptError: null,
          };
        });
        break;
      }

      case "transcript_error": {
        const error =
          typeof message.error === "string" ? message.error : "Unknown error";
        const provider = safeProvider(message.provider);
        setState((prev) => ({
          ...prev,
          provider,
          status: "error",
          transcriptError: error,
        }));
        break;
      }

      case "transcript_reset": {
        const provider = safeProvider(message.provider);
        setState({
          ...INITIAL_STATE,
          provider,
          status: "idle",
        });
        break;
      }

      // audio_start_ack carries transcriptionProvider — use it to set provider
      default:
        if (
          type === "audio_start_ack" &&
          typeof message.transcriptionProvider === "string"
        ) {
          const provider = safeProvider(message.transcriptionProvider);
          setState((prev) => ({
            ...prev,
            provider,
            status: "connecting",
            interimText: "",
            transcriptError: null,
          }));
        } else if (type === "audio_stop_ack") {
          setState((prev) => ({
            ...prev,
            status: "stopped",
            interimText: "",
          }));
        }
        break;
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setState((prev) => ({
      ...INITIAL_STATE,
      provider: prev.provider,
      status: prev.status === "stopped" ? "idle" : prev.status,
    }));
  }, []);

  return { ...state, handleMessage, clearTranscript };
}

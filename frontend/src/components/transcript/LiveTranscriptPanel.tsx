/**
 * LiveTranscriptPanel
 *
 * Displays the live transcript from the realtime speech-to-text pipeline.
 *
 * States:
 *  - idle       â†’ Prompt to start the microphone
 *  - connecting â†’ Provider is initialising
 *  - listening  â†’ Ready; waiting for speech
 *  - transcribing â†’ Showing interim text
 *  - stopped    â†’ Session ended; final transcript visible
 *  - error      â†’ Provider error with message
 */

import {
  AlertCircle,
  CheckCircle2,
  Eraser,
  FileText,
  Mic,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { LiveTranscriptState, TranscriptSegment } from "../../hooks/useLiveTranscript";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";

// â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ProviderLabel({ provider }: { provider: LiveTranscriptState["provider"] }) {
  if (provider === "deepgram") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-0.5 text-xs font-medium text-cyan-200">
        <Radio className="h-3 w-3" aria-hidden="true" />
        Deepgram realtime
      </span>
    );
  }
  if (provider === "mock") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-300">
        <Wifi className="h-3 w-3" aria-hidden="true" />
        Demo / mock mode
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900/50 px-2 py-0.5 text-xs font-medium text-zinc-500">
      <WifiOff className="h-3 w-3" aria-hidden="true" />
      Provider not connected
    </span>
  );
}

function statusTone(
  status: LiveTranscriptState["status"],
): "online" | "pending" | "warning" | "offline" {
  if (status === "transcribing" || status === "listening") return "online";
  if (status === "connecting") return "pending";
  if (status === "error") return "warning";
  return "offline";
}

function EmptyTranscript() {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
        <Mic className="h-5 w-5 text-zinc-500" aria-hidden="true" />
      </div>
      <p className="text-sm text-zinc-500">
        Start the microphone and begin audio streaming to see a live transcript here.
      </p>
    </div>
  );
}

function FinalSegment({ segment }: { segment: TranscriptSegment }) {
  return (
    <span className="group relative">
      <span className="text-zinc-100">{segment.text}</span>
      {segment.confidence !== null && (
        <span className="ml-1 text-[10px] font-medium text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
          {Math.round(segment.confidence * 100)}%
        </span>
      )}{" "}
    </span>
  );
}

// â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type LiveTranscriptPanelProps = {
  transcript: LiveTranscriptState;
  onClear: () => void;
};

export function LiveTranscriptPanel({ transcript, onClear }: LiveTranscriptPanelProps) {
  const {
    provider,
    status,
    interimText,
    finalSegments,
    fullTranscript,
    lastTranscriptAt,
    transcriptError,
  } = transcript;

  const hasContent = finalSegments.length > 0 || Boolean(interimText);

  return (
    <Card>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <h2 className="text-base font-semibold text-white">Live transcript</h2>
          </div>
          <ProviderLabel provider={provider} />
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge label={status} tone={statusTone(status)} />
          {hasContent && (
            <Button
              icon={<Eraser className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={onClear}
              size="sm"
              variant="ghost"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {transcriptError && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
          <p className="text-sm text-red-300">{transcriptError}</p>
        </div>
      )}

      {/* Mock mode notice */}
      {provider === "mock" && status !== "idle" && (
        <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] p-3">
          <p className="text-xs leading-5 text-amber-300">
            <strong>Demo transcript mode.</strong> Add a{" "}
            <code className="font-mono text-amber-200">DEEPGRAM_API_KEY</code> in{" "}
            <code className="font-mono text-amber-200">backend/.env</code> and set{" "}
            <code className="font-mono text-amber-200">TRANSCRIPTION_PROVIDER=auto</code> for
            real speech-to-text.
          </p>
        </div>
      )}

      {/* Transcript area */}
      <div
        aria-live="polite"
        aria-label="Live transcript"
        className="mt-4 min-h-[120px] rounded-lg border border-zinc-800 bg-black/30 p-4"
      >
        {!hasContent ? (
          <EmptyTranscript />
        ) : (
          <p className="text-sm leading-7">
            {finalSegments.map((seg) => (
              <FinalSegment key={seg.id} segment={seg} />
            ))}
            {interimText && (
              <span className="italic text-zinc-400">{interimText}</span>
            )}
          </p>
        )}
      </div>

      {/* Footer metadata */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-600">
          Audio is streamed to the local backend for transcription routing. No audio is stored.
        </p>
        {lastTranscriptAt && (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-cyan-400" aria-hidden="true" />
            <span className="text-xs text-zinc-500">
              Last update: {new Date(lastTranscriptAt).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Full transcript copy helper (hidden when empty) */}
      {fullTranscript && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">
            Full transcript text
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-zinc-800 bg-black/20 p-3 text-xs leading-5 text-zinc-300 whitespace-pre-wrap">
            {fullTranscript}
          </pre>
        </details>
      )}
    </Card>
  );
}

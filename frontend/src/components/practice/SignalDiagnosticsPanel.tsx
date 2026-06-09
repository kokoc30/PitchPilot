import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  AudioLines,
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  Radio,
  ScanFace,
  Signal,
  SignalHigh,
  SlidersHorizontal,
  Waves,
} from "lucide-react";
import type { UseAudioStreamerResult } from "../../hooks/useAudioStreamer";
import type { LiveTranscriptState } from "../../hooks/useLiveTranscript";
import type { UseMediaPipeTrackingResult } from "../../hooks/useMediaPipeTracking";
import type { UseMicrophoneResult } from "../../hooks/useMicrophone";
import type { UseWebcamResult } from "../../hooks/useWebcam";
import { StatusBadge } from "../ui/StatusBadge";
import { cn } from "../../lib/utils";

type Tone = "online" | "offline" | "pending" | "warning";

type SignalDiagnosticsPanelProps = {
  webcam: UseWebcamResult;
  tracking: UseMediaPipeTrackingResult;
  microphone: UseMicrophoneResult;
  streamer: UseAudioStreamerResult;
  transcript: LiveTranscriptState;
};

export function SignalDiagnosticsPanel({
  webcam,
  tracking,
  microphone,
  streamer,
  transcript,
}: SignalDiagnosticsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const cameraTone: Tone = webcam.isActive
    ? "online"
    : webcam.error
      ? "warning"
      : "offline";
  const trackingTone: Tone = tracking.isTracking
    ? "online"
    : tracking.isInitializing
      ? "pending"
      : tracking.trackingStatus === "error"
        ? "warning"
        : "offline";
  const micTone: Tone =
    microphone.status === "active"
      ? "online"
      : microphone.status === "starting"
        ? "pending"
        : microphone.status === "error"
          ? "warning"
          : "offline";
  const streamTone: Tone = streamer.isStreaming
    ? "online"
    : streamer.connectionStatus === "connected"
      ? "pending"
      : streamer.connectionStatus === "error"
        ? "warning"
        : "offline";
  const transcriptTone: Tone =
    transcript.status === "transcribing" || transcript.status === "listening"
      ? "online"
      : transcript.status === "connecting"
        ? "pending"
        : transcript.status === "error"
          ? "warning"
          : "offline";

  const meterPercent = microphone.isActive
    ? Math.round(Math.max(0, Math.min(1, microphone.audioLevel)) * 100)
    : 0;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/72 shadow-panel">
      <button
        aria-controls="signal-diagnostics-content"
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-5 py-4 text-left transition hover:bg-zinc-900/40 focus:outline-none"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-zinc-400">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-white">Signal diagnostics</p>
            <p className="text-[11px] text-zinc-400">Detailed camera, MediaPipe, audio, and streaming metrics.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
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
        id="signal-diagnostics-content"
        initial={false}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="border-t border-zinc-800 p-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatusRow
              icon={<Camera className="h-4 w-4" aria-hidden="true" />}
              label="Camera"
              tone={cameraTone}
              toneLabel={cameraTone === "online" ? "active" : webcam.status}
              detail={
                webcam.diagnostics.resolution !== "Unavailable"
                  ? webcam.diagnostics.resolution
                  : "Awaiting preview"
              }
            />

            <StatusRow
              icon={<ScanFace className="h-4 w-4" aria-hidden="true" />}
              label="MediaPipe"
              tone={trackingTone}
              toneLabel={
                tracking.isTracking
                  ? `${tracking.fps} fps`
                  : tracking.trackingStatus === "loading"
                    ? "loading"
                    : tracking.trackingStatus
              }
              detail={
                tracking.faceVisible
                  ? `Face ${tracking.faceDirection} • posture ${tracking.postureSignal}`
                  : "Face not detected"
              }
            />

            <StatusRow
              icon={<Eye className="h-4 w-4" aria-hidden="true" />}
              label="Camera-facing"
              tone={
                tracking.cameraFacingEstimate === "good"
                  ? "online"
                  : tracking.cameraFacingEstimate === "partial"
                    ? "pending"
                    : tracking.cameraFacingEstimate === "low"
                      ? "warning"
                      : "offline"
              }
              toneLabel={tracking.cameraFacingEstimate}
              detail={
                tracking.headMovement !== "unknown"
                  ? `Head ${tracking.headMovement}`
                  : "No head signal yet"
              }
            />

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/55 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-zinc-200">
                  <AudioLines className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                  Microphone
                </span>
                <StatusBadge label={microphone.status} tone={micTone} />
              </div>
              <div
                aria-hidden="true"
                className="mt-2 h-1.5 overflow-hidden rounded-full border border-zinc-800/80 bg-zinc-950"
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-150 ease-out",
                    !microphone.isActive
                      ? "bg-zinc-700"
                      : meterPercent >= 70
                        ? "bg-rose-300"
                        : meterPercent >= 45
                          ? "bg-amber-300"
                          : "bg-cyan-300",
                  )}
                  style={{ width: `${meterPercent}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-500">
                Input level {meterPercent}/100
              </p>
            </div>

            <StatusRow
              icon={<SignalHigh className="h-4 w-4" aria-hidden="true" />}
              label="Streaming"
              tone={streamTone}
              toneLabel={
                streamer.isStreaming
                  ? "live"
                  : streamer.connectionStatus
              }
              detail={
                streamer.isStreaming
                  ? "Audio streaming"
                  : "Awaiting audio"
              }
            />

            <StatusRow
              icon={<Radio className="h-4 w-4" aria-hidden="true" />}
              label="Transcription"
              tone={transcriptTone}
              toneLabel={transcript.status}
              detail={
                transcript.provider === "none"
                  ? "Not connected"
                  : transcript.provider === "deepgram"
                    ? "Connected"
                    : "Demo transcription"
              }
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5 text-[11px] leading-5 text-zinc-500">
            <Waves className="mt-0.5 h-3.5 w-3.5 flex-none text-cyan-300" aria-hidden="true" />
            <p>
              All signals are derived in-browser. Audio is forwarded to the
              local backend for transcription routing. All processing is local.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

type StatusRowProps = {
  icon: ReactNode;
  label: string;
  tone: Tone;
  toneLabel: string;
  detail?: string;
};

function StatusRow({ icon, label, tone, toneLabel, detail }: StatusRowProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/55 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-zinc-200">
          <span className="text-cyan-300" aria-hidden="true">
            {icon}
          </span>
          {label}
        </span>
        <StatusBadge label={toneLabel} tone={tone} />
      </div>
      {detail && (
        <p className="mt-1 text-[11px] text-zinc-500">{detail}</p>
      )}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / Math.pow(1024, exponent);
  const formatted = value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(2);
  return `${formatted} ${units[exponent]}`;
}

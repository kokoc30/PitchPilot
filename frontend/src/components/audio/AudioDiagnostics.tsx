import { Activity, Mic, Radio } from "lucide-react";
import type { UseMicrophoneResult } from "../../hooks/useMicrophone";
import type { UseAudioStreamerResult } from "../../hooks/useAudioStreamer";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";

type AudioDiagnosticsProps = {
  microphone: UseMicrophoneResult;
  streamer: UseAudioStreamerResult;
};

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-zinc-800 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="max-w-[14rem] break-words text-right text-sm font-medium text-zinc-200">
        {value}
      </dd>
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

function formatAck(ack: ReturnType<typeof Object> | null) {
  if (!ack) return "None";
  try {
    const compact = JSON.stringify(ack);
    return compact.length > 90 ? `${compact.slice(0, 87)}...` : compact;
  } catch {
    return "Unavailable";
  }
}

export function AudioDiagnostics({ microphone, streamer }: AudioDiagnosticsProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-400">Audio diagnostics</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Microphone &amp; stream</h2>
        </div>
        <Radio className="h-5 w-5 text-cyan-300" aria-hidden="true" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge
          label={microphone.isSupported ? "mic api ready" : "unsupported"}
          tone={microphone.isSupported ? "online" : "warning"}
        />
        <StatusBadge
          label={streamer.isRecorderSupported ? "MediaRecorder ready" : "MediaRecorder missing"}
          tone={streamer.isRecorderSupported ? "online" : "warning"}
        />
        <StatusBadge
          label={`mic ${microphone.isActive ? "active" : "inactive"}`}
          tone={microphone.isActive ? "online" : "offline"}
        />
        <StatusBadge
          label={`stream ${streamer.isStreaming ? "live" : "idle"}`}
          tone={streamer.isStreaming ? "online" : "offline"}
        />
      </div>

      <dl className="mt-5">
        <DiagnosticRow
          label="Browser microphone support"
          value={microphone.isSupported ? "Supported" : "Unsupported"}
        />
        <DiagnosticRow
          label="Permission state"
          value={microphone.permissionState}
        />
        <DiagnosticRow
          label="Microphone active"
          value={microphone.isActive ? "Yes" : "No"}
        />
        <DiagnosticRow
          label="Detected microphones"
          value={String(microphone.diagnostics.audioInputCount)}
        />
        <DiagnosticRow
          label="Selected input"
          value={microphone.diagnostics.selectedDeviceLabel}
        />
        <DiagnosticRow
          label="Selected device ID"
          value={microphone.diagnostics.selectedDeviceId}
        />
        <DiagnosticRow
          label="Track readyState"
          value={microphone.diagnostics.audioTrackReadyState}
        />
        <DiagnosticRow
          label="Sample rate"
          value={microphone.diagnostics.sampleRate}
        />
        <DiagnosticRow
          label="Channel count"
          value={microphone.diagnostics.channelCount}
        />
        <DiagnosticRow
          label="MediaRecorder support"
          value={streamer.isRecorderSupported ? "Yes" : "No"}
        />
        <DiagnosticRow
          label="Selected MIME type"
          value={streamer.selectedMimeType || "browser default"}
        />
        <DiagnosticRow
          label="WebSocket status"
          value={streamer.connectionStatus}
        />
        <DiagnosticRow
          label="Reconnect attempts"
          value={String(streamer.reconnectAttempts)}
        />
        <DiagnosticRow
          label="Chunks sent"
          value={String(streamer.chunksSent)}
        />
        <DiagnosticRow
          label="Bytes sent"
          value={`${streamer.bytesSent} (${formatBytes(streamer.bytesSent)})`}
        />
        <DiagnosticRow
          label="Last backend ack"
          value={formatAck(streamer.lastAck)}
        />
        <DiagnosticRow
          label="Last microphone error"
          value={microphone.error ?? microphone.lastErrorName ?? "None"}
        />
        <DiagnosticRow
          label="Last stream error"
          value={streamer.lastError ?? "None"}
        />
      </dl>

      <div className="mt-5 grid gap-3 text-sm leading-6 text-zinc-400">
        <div className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <Mic className="mt-0.5 h-4 w-4 flex-none text-cyan-300" aria-hidden="true" />
          <p>
            The microphone is requested only when you click Start microphone. Audio is
            never saved to disk in Task 6.
          </p>
        </div>
        <div className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <Activity className="mt-0.5 h-4 w-4 flex-none text-amber-300" aria-hidden="true" />
          <p>
            Audio chunks are sent as binary WebSocket frames to ws://localhost:8000.
            Transcription and AI coaching arrive in later tasks.
          </p>
        </div>
      </div>
    </Card>
  );
}

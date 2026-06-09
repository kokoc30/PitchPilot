import {
  CircleStop,
  Loader2,
  Mic,
  MicOff,
  RotateCcw,
  ShieldAlert,
  Signal,
  SignalHigh,
} from "lucide-react";
import type { UseMicrophoneResult } from "../../hooks/useMicrophone";
import type {
  AudioConnectionStatus,
  UseAudioStreamerResult,
} from "../../hooks/useAudioStreamer";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";
import { AudioLevelMeter } from "./AudioLevelMeter";

type MicrophonePanelProps = {
  microphone: UseMicrophoneResult;
  streamer: UseAudioStreamerResult;
};

function permissionTone(state: UseMicrophoneResult["permissionState"]) {
  if (state === "granted") return "online" as const;
  if (state === "prompt" || state === "unknown") return "pending" as const;
  return "warning" as const;
}

function connectionTone(status: AudioConnectionStatus) {
  if (status === "connected") return "online" as const;
  if (status === "connecting" || status === "reconnecting")
    return "pending" as const;
  if (status === "error") return "warning" as const;
  return "offline" as const;
}

function micStatusLabel(status: UseMicrophoneResult["status"]) {
  switch (status) {
    case "active":
      return "active";
    case "starting":
      return "starting";
    case "error":
      return "error";
    case "unsupported":
      return "unsupported";
    default:
      return "inactive";
  }
}

function MicrophoneAdvice({ microphone }: { microphone: UseMicrophoneResult }) {
  if (microphone.errorType === "permission_denied" || microphone.permissionState === "denied") {
    return (
      <div className="flex gap-3 rounded-lg border border-rose-400/25 bg-rose-400/10 p-3 text-rose-100">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
        <p>
          Click the browser lock or sliders icon near the address bar, set Microphone to
          Allow, reload the page, then try Start Microphone again.
        </p>
      </div>
    );
  }

  if (microphone.errorType === "busy") {
    return (
      <div className="flex gap-3 rounded-lg border border-amber-400/25 bg-amber-400/10 p-3 text-amber-100">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
        <p>
          Close other audio apps such as Zoom, Teams, OBS, Discord, or other browser
          tabs that may hold the microphone, then retry.
        </p>
      </div>
    );
  }

  if (microphone.errorType === "not_found") {
    return (
      <div className="flex gap-3 rounded-lg border border-amber-400/25 bg-amber-400/10 p-3 text-amber-100">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
        <p>
          No microphone was detected. Plug in a microphone or enable the system input,
          then click Reload devices.
        </p>
      </div>
    );
  }

  return null;
}

export function MicrophonePanel({ microphone, streamer }: MicrophonePanelProps) {
  const canStart =
    microphone.isSupported && !microphone.isStarting && !microphone.isActive;
  const canStop = microphone.isActive || microphone.isStarting;
  const canStream =
    microphone.isActive &&
    streamer.connectionStatus === "connected" &&
    streamer.isRecorderSupported;

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-400">Microphone</p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Capture and stream audio
          </h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-cyan-300">
          {microphone.isActive ? (
            <Mic className="h-5 w-5" aria-hidden="true" />
          ) : (
            <MicOff className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge
          label={microphone.isSupported ? "mediaDevices ready" : "unsupported"}
          tone={microphone.isSupported ? "online" : "warning"}
        />
        <StatusBadge
          label={`permission: ${microphone.permissionState}`}
          tone={permissionTone(microphone.permissionState)}
        />
        <StatusBadge
          label={`mic ${micStatusLabel(microphone.status)}`}
          tone={
            microphone.status === "active"
              ? "online"
              : microphone.status === "error" || microphone.status === "unsupported"
                ? "warning"
                : microphone.status === "starting"
                  ? "pending"
                  : "offline"
          }
        />
        <StatusBadge
          label={`ws ${streamer.connectionStatus}`}
          tone={connectionTone(streamer.connectionStatus)}
        />
        <StatusBadge
          label={streamer.isStreaming ? "streaming" : "stream idle"}
          tone={streamer.isStreaming ? "online" : "offline"}
        />
      </div>

      <div className="mt-5">
        <AudioLevelMeter
          isActive={microphone.isActive}
          level={microphone.audioLevel}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          disabled={!canStart}
          icon={
            microphone.isStarting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mic className="h-4 w-4" aria-hidden="true" />
            )
          }
          onClick={() => microphone.startMicrophone()}
        >
          {microphone.isStarting
            ? "Starting..."
            : microphone.error
              ? "Retry microphone"
              : "Start microphone"}
        </Button>
        <Button
          disabled={!canStop}
          icon={<MicOff className="h-4 w-4" aria-hidden="true" />}
          onClick={() => {
            streamer.stopStreaming();
            microphone.stopMicrophone();
          }}
          variant="secondary"
        >
          Stop microphone
        </Button>
        <Button
          disabled={!canStream || streamer.isStreaming}
          icon={<SignalHigh className="h-4 w-4" aria-hidden="true" />}
          onClick={() => streamer.startStreaming()}
          variant="secondary"
        >
          Start streaming
        </Button>
        <Button
          disabled={!streamer.isStreaming}
          icon={<CircleStop className="h-4 w-4" aria-hidden="true" />}
          onClick={() => streamer.stopStreaming()}
          variant="secondary"
        >
          Stop streaming
        </Button>
        <Button
          icon={<Signal className="h-4 w-4" aria-hidden="true" />}
          onClick={() => streamer.sendPing()}
          variant="ghost"
        >
          Send ping
        </Button>
        <Button
          icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
          onClick={() => microphone.resetMicrophoneDevice()}
          variant="ghost"
        >
          Reset device
        </Button>
        <Button
          icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
          onClick={() => microphone.loadDevices()}
          variant="ghost"
        >
          Reload devices
        </Button>
      </div>

      <div className="mt-5 grid gap-3">
        <div>
          <label
            className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500"
            htmlFor="microphone-device"
          >
            Input device
          </label>
          <select
            className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-cyan-300/45 focus:outline-none focus:ring-1 focus:ring-cyan-300/45"
            disabled={!microphone.devices.length}
            id="microphone-device"
            onChange={(event) => microphone.switchMicrophone(event.target.value)}
            value={microphone.selectedDeviceId ?? ""}
          >
            {microphone.devices.length === 0 ? (
              <option value="">No input devices found</option>
            ) : null}
            {microphone.devices.map((device) => (
              <option key={device.deviceId || device.label} value={device.deviceId}>
                {device.label || `Microphone (${device.deviceId.slice(0, 8) || "default"})`}
              </option>
            ))}
          </select>
        </div>

        {microphone.error ? (
          <div className="flex items-start gap-3 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <div>
              <p className="font-medium">Microphone error</p>
              <p className="mt-1 leading-6">{microphone.error}</p>
              <button
                className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-200 underline"
                onClick={() => microphone.clearError()}
                type="button"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {streamer.lastError ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <p>{streamer.lastError}</p>
          </div>
        ) : null}

        <MicrophoneAdvice microphone={microphone} />

        <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-3 text-sm leading-6 text-cyan-100">
          Audio is streamed to the local backend for transcription routing.
          Stop microphone or stop streaming at any time.
        </div>
      </div>
    </Card>
  );
}

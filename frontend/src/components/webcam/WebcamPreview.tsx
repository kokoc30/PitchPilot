import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import {
  AlertCircle,
  Camera,
  CameraOff,
  Loader2,
} from "lucide-react";
import type { UseWebcamResult } from "../../hooks/useWebcam";
import type { UseMicrophoneResult } from "../../hooks/useMicrophone";
import type { SessionLifecycle } from "../practice/PracticeSessionHeader";
import { PracticeControlBar } from "../practice/PracticeControlBar";
import { cn } from "../../lib/utils";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";

type WebcamPreviewProps = {
  webcam: UseWebcamResult;
  className?: string;
  overlay?: ReactNode;
  videoRef?: RefObject<HTMLVideoElement>;

  // Practice session state and controls
  microphone: UseMicrophoneResult;
  isPracticeActive: boolean;
  onTogglePractice: () => void;
  onStopAll: () => void;
  onResetMetrics: () => void;
  onClearTranscript: () => void;
  sessionLifecycle: SessionLifecycle;
};

function getPracticeStatus(
  webcam: UseWebcamResult,
  microphone: UseMicrophoneResult,
  sessionLifecycle: SessionLifecycle
) {
  if (sessionLifecycle === "live") {
    return { label: "Listening", tone: "cyan" as const };
  }
  if (sessionLifecycle === "preparing") {
    return { label: "Ready", tone: "pending" as const };
  }
  if (microphone.isActive && webcam.isActive) {
    return { label: "Ready", tone: "cyan" as const };
  }
  if (webcam.isActive) {
    return { label: "Camera on", tone: "online" as const };
  }
  if (microphone.isActive) {
    return { label: "Listening", tone: "cyan" as const };
  }
  if (webcam.error || microphone.error) {
    return { label: "Setup issue", tone: "warning" as const };
  }
  return { label: "Camera off", tone: "offline" as const };
}

function cameraErrorAdvice(webcam: UseWebcamResult) {
  if (webcam.errorType === "permission_denied" || webcam.permissionState === "denied") {
    return "Open browser settings, set Camera to Allow for this site, then retry.";
  }
  if (webcam.errorType === "busy") {
    return "Close other camera apps (Zoom, Teams, OBS) and try again.";
  }
  return "Check browser camera settings and try again.";
}

export function WebcamPreview({
  webcam,
  className,
  overlay,
  videoRef,
  microphone,
  isPracticeActive,
  onTogglePractice,
  onStopAll,
  onResetMetrics,
  onClearTranscript,
  sessionLifecycle,
}: WebcamPreviewProps) {
  const fallbackVideoRef = useRef<HTMLVideoElement | null>(null);
  const resolvedVideoRef = videoRef ?? fallbackVideoRef;

  useEffect(() => {
    const video = resolvedVideoRef.current;
    if (!video) return undefined;

    video.srcObject = webcam.stream;

    if (webcam.stream) {
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => undefined);
      }
    }

    return () => {
      video.srcObject = null;
    };
  }, [resolvedVideoRef, webcam.stream]);

  const statusInfo = getPracticeStatus(webcam, microphone, sessionLifecycle);

  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      {/* Practice Setup Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Practice setup</h2>
        <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
      </div>

      {/* Embedded unified control bar */}
      <PracticeControlBar
        variant="embedded"
        isPracticeActive={isPracticeActive}
        onTogglePractice={onTogglePractice}
        sessionLifecycle={sessionLifecycle}
        isMicrophoneActive={microphone.isActive}
        isMicrophoneStarting={microphone.isStarting}
        canStartMicrophone={microphone.isSupported && !microphone.isStarting && !microphone.isActive}
        onStartMicrophone={() => void microphone.startMicrophone()}
        onStopMicrophone={microphone.stopMicrophone}
        isCameraActive={webcam.isActive}
        isCameraStarting={webcam.isStarting}
        onStartCamera={() => void webcam.startCamera()}
        onStopCamera={webcam.stopCamera}
        cameraError={Boolean(webcam.error)}
        onStopAll={onStopAll}
        onResetMetrics={onResetMetrics}
        onClearTranscript={onClearTranscript}
      />

      <div className="p-4">
        {/* Video preview area */}
        <div className="relative aspect-video overflow-hidden rounded-lg border border-zinc-800 bg-black">
          {webcam.stream ? (
            <video
              aria-label="Live webcam preview"
              autoPlay
              className="h-full w-full object-cover"
              muted
              playsInline
              ref={resolvedVideoRef}
            />
          ) : (
            <div className="flex h-full min-h-[16rem] flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.12),transparent_34%),linear-gradient(135deg,rgba(24,24,27,0.92),rgba(9,9,11,0.96))] p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400">
                {webcam.isStarting ? (
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-300" aria-hidden="true" />
                ) : webcam.error || !webcam.isSupported ? (
                  <CameraOff className="h-8 w-8 text-rose-200" aria-hidden="true" />
                ) : (
                  <Camera className="h-8 w-8 text-cyan-300" aria-hidden="true" />
                )}
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">
                {webcam.isStarting
                  ? "Requesting camera access"
                  : webcam.error
                    ? "Camera could not start"
                    : webcam.isSupported
                      ? "Camera is off"
                      : "Camera unsupported"}
              </h3>
              {!webcam.isStarting && !webcam.error && webcam.isSupported && (
                <p className="mt-2 max-w-xs text-sm text-zinc-400">
                  Toggle Camera on in the practice setup controls above.
                </p>
              )}
            </div>
          )}

          {webcam.stream ? overlay : null}

          {webcam.isStarting ? (
            <div className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-medium text-cyan-100">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-zinc-950/80 px-3 py-1.5">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Starting camera
              </span>
            </div>
          ) : null}
        </div>

        {/* Inline camera error message */}
        {webcam.error ? (
          <div className="mt-3 flex gap-3 rounded-lg border border-rose-400/25 bg-rose-400/10 p-3 text-sm leading-6 text-rose-100">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <div className="min-w-0">
               <p>{webcam.error}</p>
               <p className="mt-1 text-xs text-rose-100/80">{cameraErrorAdvice(webcam)}</p>
               <button
                 className="mt-1.5 text-xs font-semibold text-rose-100 underline-offset-4 hover:underline"
                 onClick={webcam.clearError}
                 type="button"
               >
                 Dismiss
               </button>
            </div>
          </div>
        ) : null}

        {/* Inline microphone error message */}
        {microphone.error ? (
          <div className="mt-3 flex gap-3 rounded-lg border border-rose-400/25 bg-rose-400/10 p-3 text-sm leading-6 text-rose-100">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <div className="min-w-0">
               <p>{microphone.error}</p>
               <button
                 className="mt-1.5 text-xs font-semibold text-rose-100 underline-offset-4 hover:underline"
                 onClick={microphone.clearError}
                 type="button"
               >
                 Dismiss
               </button>
            </div>
          </div>
        ) : null}

        {/* Device selectors (only when multiple devices) */}
        {(webcam.devices.length > 1 || microphone.devices.length > 1) && (
          <div className={cn(
            "grid gap-3 mt-3",
            (webcam.devices.length > 1 && microphone.devices.length > 1) ? "sm:grid-cols-2" : "grid-cols-1"
          )}>
            {/* Camera device selector */}
            {webcam.devices.length > 1 && (
              <label className="block">
                <span className="text-xs font-medium text-zinc-400">Camera device</span>
                <select
                  className="mt-1.5 h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={webcam.isStarting}
                  onChange={(event) => webcam.switchCamera(event.target.value)}
                  value={webcam.selectedDeviceId ?? ""}
                >
                  {webcam.devices.map((device, index) => (
                    <option key={device.deviceId || index} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Microphone device selector */}
            {microphone.devices.length > 1 && (
              <label className="block">
                <span className="text-xs font-medium text-zinc-400">Microphone device</span>
                <select
                  className="mt-1.5 h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={microphone.isStarting}
                  onChange={(event) => microphone.switchMicrophone(event.target.value)}
                  value={microphone.selectedDeviceId ?? ""}
                >
                  {microphone.devices.map((device, index) => (
                    <option key={device.deviceId || index} value={device.deviceId}>
                      {device.label || `Microphone ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

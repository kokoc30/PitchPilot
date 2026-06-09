/**
 * PracticeControlBar
 *
 * Unified entry point for the realtime practice session.
 * Camera is controlled via WebcamPreview or here in embedded mode to avoid duplication.
 * This bar owns: session toggle, microphone toggle, camera toggle (in embedded mode), and utility actions.
 */

import { motion } from "framer-motion";
import {
  CircleStop,
  Eraser,
  Mic,
  MicOff,
  Pause,
  Play,
  RefreshCw,
  Camera,
  CameraOff,
} from "lucide-react";
import { Button } from "../ui/Button";
import { ControlToggle } from "../ui/ControlToggle";
import type { SessionLifecycle } from "./PracticeSessionHeader";

type PracticeControlBarProps = {
  // Session toggle
  isPracticeActive: boolean;
  onTogglePractice: () => void;
  sessionLifecycle: SessionLifecycle;

  // Microphone
  isMicrophoneActive: boolean;
  isMicrophoneStarting: boolean;
  canStartMicrophone: boolean;
  onStartMicrophone: () => void;
  onStopMicrophone: () => void;

  // Camera (for embedded mode)
  isCameraActive?: boolean;
  isCameraStarting?: boolean;
  onStartCamera?: () => void;
  onStopCamera?: () => void;
  cameraError?: boolean;

  // Aggregate actions
  onStopAll: () => void;
  onResetMetrics: () => void;
  onClearTranscript: () => void;

  // Layout variant
  variant?: "standalone" | "embedded";
};

export function PracticeControlBar({
  isPracticeActive,
  onTogglePractice,
  sessionLifecycle,
  isMicrophoneActive,
  isMicrophoneStarting,
  canStartMicrophone,
  onStartMicrophone,
  onStopMicrophone,
  isCameraActive = false,
  isCameraStarting = false,
  onStartCamera,
  onStopCamera,
  cameraError = false,
  onStopAll,
  onResetMetrics,
  onClearTranscript,
  variant = "standalone",
}: PracticeControlBarProps) {
  const handleMicToggle = () => {
    if (isMicrophoneActive || isMicrophoneStarting) {
      onStopMicrophone();
    } else {
      onStartMicrophone();
    }
  };

  const micStatusText = isMicrophoneStarting
    ? "Starting…"
    : isMicrophoneActive
      ? "Listening"
      : canStartMicrophone
        ? "Off"
        : "Unavailable";

  const isCameraOn = isCameraActive || isCameraStarting;

  const handleCameraToggle = () => {
    if (isCameraOn) {
      onStopCamera?.();
    } else {
      onStartCamera?.();
    }
  };

  const cameraStatusText = isCameraStarting
    ? "Starting…"
    : cameraError
      ? "Permission needed"
      : isCameraActive
        ? "On"
        : "Off";

  const primaryButtonLabel = isPracticeActive
    ? "Pause practice"
    : sessionLifecycle === "ended"
      ? "Resume practice"
      : "Start practice";

  // --- Embedded Variant (Inside Camera/Practice setup card) ---
  if (variant === "embedded") {
    return (
      <div className="border-b border-zinc-800 bg-zinc-950/40 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:flex-nowrap">
          {/* Left: Primary actions + media toggles */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full sm:w-auto">
            {/* Primary Session Toggle */}
            <Button
              icon={
                isPracticeActive ? (
                  <Pause className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Play className="h-4 w-4" aria-hidden="true" />
                )
              }
              onClick={onTogglePractice}
              className="w-full sm:w-auto shrink-0"
            >
              {primaryButtonLabel}
            </Button>

            {/* Media Toggles */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 w-full sm:w-auto">
              {/* Camera Toggle */}
              <ControlToggle
                checked={isCameraOn}
                disabled={isCameraStarting}
                error={cameraError}
                icon={
                  cameraError ? (
                    <CameraOff className="h-4 w-4" aria-hidden="true" />
                  ) : isCameraOn ? (
                    <Camera className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <CameraOff className="h-4 w-4" aria-hidden="true" />
                  )
                }
                label="Camera"
                loading={isCameraStarting}
                onToggle={handleCameraToggle}
                statusText={cameraStatusText}
                className="w-full sm:w-auto"
              />

              {/* Microphone Toggle */}
              <ControlToggle
                checked={isMicrophoneActive || isMicrophoneStarting}
                disabled={!canStartMicrophone && !isMicrophoneActive && !isMicrophoneStarting}
                icon={
                  isMicrophoneActive ? (
                    <Mic className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <MicOff className="h-4 w-4" aria-hidden="true" />
                  )
                }
                label="Microphone"
                loading={isMicrophoneStarting}
                onToggle={handleMicToggle}
                statusText={micStatusText}
                className="w-full sm:w-auto"
              />
            </div>
          </div>

          {/* Right: Secondary/Utility actions */}
          <div className="flex items-center justify-between sm:justify-end gap-2 border-t border-zinc-800/60 pt-3 sm:border-t-0 sm:pt-0 w-full sm:w-auto">
            <Button
              icon={<CircleStop className="h-4 w-4" aria-hidden="true" />}
              onClick={onStopAll}
              size="sm"
              title="Stops microphone and camera. Transcript and metrics stay until reset."
              variant="secondary"
              className="flex-1 sm:flex-none text-[12px]"
            >
              Stop all
            </Button>
            <Button
              icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
              onClick={onResetMetrics}
              size="sm"
              variant="ghost"
              className="flex-1 sm:flex-none text-[12px]"
            >
              Reset
            </Button>
            <Button
              icon={<Eraser className="h-4 w-4" aria-hidden="true" />}
              onClick={onClearTranscript}
              size="sm"
              variant="ghost"
              className="flex-1 sm:flex-none text-[12px]"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- Standalone Variant (Fallback / Top Bar) ---
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800 bg-zinc-950/72 p-4 shadow-panel"
      initial={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.25, delay: 0.05, ease: "easeOut" }}
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* Primary session toggle */}
        <Button
          icon={
            isPracticeActive ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )
          }
          onClick={onTogglePractice}
        >
          {primaryButtonLabel}
        </Button>

        {/* Divider */}
        <span className="hidden h-8 w-px bg-zinc-800 sm:block" aria-hidden="true" />

        {/* Microphone toggle */}
        <ControlToggle
          checked={isMicrophoneActive || isMicrophoneStarting}
          disabled={!canStartMicrophone && !isMicrophoneActive && !isMicrophoneStarting}
          icon={
            isMicrophoneActive ? (
              <Mic className="h-4 w-4" aria-hidden="true" />
            ) : (
              <MicOff className="h-4 w-4" aria-hidden="true" />
            )
          }
          label="Microphone"
          loading={isMicrophoneStarting}
          onToggle={handleMicToggle}
          statusText={micStatusText}
        />

        {/* Spacer to push utility actions right */}
        <span className="flex-1" />

        {/* Utility actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            icon={<CircleStop className="h-4 w-4" aria-hidden="true" />}
            onClick={onStopAll}
            size="sm"
            title="Stops microphone and camera. Transcript and metrics stay until reset."
            variant="secondary"
          >
            Stop all
          </Button>
          <Button
            icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
            onClick={onResetMetrics}
            size="sm"
            variant="ghost"
          >
            Reset
          </Button>
          <Button
            icon={<Eraser className="h-4 w-4" aria-hidden="true" />}
            onClick={onClearTranscript}
            size="sm"
            variant="ghost"
          >
            Clear
          </Button>
        </div>
      </div>
    </motion.section>
  );
}

import { Activity, AlertCircle, Play, RefreshCw, ScanFace, ShieldCheck } from "lucide-react";
import type { UseMediaPipeTrackingResult } from "../../hooks/useMediaPipeTracking";
import { MEDIAPIPE_ASSET_STRATEGY } from "../../lib/mediapipe";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";

type TrackingDiagnosticsProps = {
  isCameraActive: boolean;
  tracking: UseMediaPipeTrackingResult;
};

function trackingTone(tracking: UseMediaPipeTrackingResult, isCameraActive: boolean) {
  if (!tracking.isSupported || tracking.trackingStatus === "error") return "warning" as const;
  if (tracking.isInitializing || tracking.trackingStatus === "loading") return "pending" as const;
  if (tracking.isTracking) return "online" as const;
  if (!isCameraActive) return "offline" as const;
  return "pending" as const;
}

function trackingLabel(tracking: UseMediaPipeTrackingResult, isCameraActive: boolean) {
  if (!tracking.isSupported) return "unsupported";
  if (tracking.trackingStatus === "error") return "tracking error";
  if (tracking.isInitializing || tracking.trackingStatus === "loading") return "loading MediaPipe";
  if (tracking.isTracking) return "tracking active";
  if (!isCameraActive) return "waiting for camera";
  return "tracking ready";
}

function visibilityLabel(value: boolean) {
  return value ? "Visible" : "Not detected";
}

function formatPercent(value: number | null) {
  if (value === null) return "Unavailable";
  return `${Math.round(value * 100)}%`;
}

function formatFrameTime(value: number | null) {
  if (!value) return "No frames yet";
  return new Date(value).toLocaleTimeString();
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-zinc-800 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="max-w-[13rem] text-right text-sm font-medium text-zinc-200">{value}</dd>
    </div>
  );
}

export function TrackingDiagnostics({ isCameraActive, tracking }: TrackingDiagnosticsProps) {
  const canStartTracking =
    isCameraActive &&
    tracking.isSupported &&
    !tracking.isInitializing &&
    !tracking.isTracking;

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-400">Computer vision</p>
          <h2 className="mt-2 text-lg font-semibold text-white">MediaPipe tracking</h2>
        </div>
        <ScanFace className="h-5 w-5 text-cyan-300" aria-hidden="true" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge label={trackingLabel(tracking, isCameraActive)} tone={trackingTone(tracking, isCameraActive)} />
        <StatusBadge
          label={tracking.faceVisible ? "face visible" : "face waiting"}
          tone={tracking.faceVisible ? "online" : "offline"}
        />
        <StatusBadge
          label={tracking.poseEnabled ? "pose enabled" : "pose optional"}
          tone={tracking.poseEnabled ? "online" : "pending"}
        />
      </div>

      <dl className="mt-5">
        <DiagnosticRow
          label="MediaPipe status"
          value={trackingLabel(tracking, isCameraActive)}
        />
        <DiagnosticRow label="Tracking loop" value={tracking.isTracking ? "Active" : "Inactive"} />
        <DiagnosticRow label="Face visible" value={visibilityLabel(tracking.faceVisible)} />
        <DiagnosticRow label="Pose visible" value={visibilityLabel(tracking.poseVisible)} />
        <DiagnosticRow label="Face direction" value={tracking.faceDirection} />
        <DiagnosticRow
          label="Camera-facing estimate"
          value={tracking.cameraFacingEstimate}
        />
        <DiagnosticRow label="Head movement" value={tracking.headMovement} />
        <DiagnosticRow label="Posture signal" value={tracking.postureSignal} />
        <DiagnosticRow label="Face confidence" value={formatPercent(tracking.faceConfidence)} />
        <DiagnosticRow label="Pose confidence" value={formatPercent(tracking.poseConfidence)} />
        <DiagnosticRow
          label="Landmarks"
          value={`${tracking.faceLandmarksCount} face / ${tracking.poseLandmarksCount} pose`}
        />
        <DiagnosticRow label="Analysis FPS" value={`${tracking.fps} fps`} />
        <DiagnosticRow label="Last frame" value={formatFrameTime(tracking.lastFrameTime)} />
      </dl>

      {tracking.trackingError || tracking.poseError ? (
        <div className="mt-5 flex gap-3 rounded-lg border border-amber-400/25 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <p>{tracking.trackingError ?? tracking.poseError}</p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Button
          disabled={!canStartTracking}
          icon={<Play className="h-4 w-4" aria-hidden="true" />}
          onClick={() => void tracking.startTracking()}
          size="sm"
          variant="secondary"
        >
          Start tracking
        </Button>
        <Button
          disabled={tracking.isInitializing}
          icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          onClick={tracking.resetTracking}
          size="sm"
          variant="secondary"
        >
          Reset tracking
        </Button>
      </div>

      <div className="mt-5 grid gap-3 text-sm leading-6 text-zinc-400">
        <div className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-cyan-300" aria-hidden="true" />
          <p>Video analysis runs locally in your browser. Frames are not uploaded.</p>
        </div>
        <div className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <Activity className="mt-0.5 h-4 w-4 flex-none text-zinc-300" aria-hidden="true" />
          <p>{MEDIAPIPE_ASSET_STRATEGY}</p>
        </div>
      </div>
    </Card>
  );
}

import { Activity, Camera, MonitorCheck, ShieldAlert, SlidersHorizontal, Video } from "lucide-react";
import type { UseWebcamResult } from "../../hooks/useWebcam";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";

type WebcamDiagnosticsProps = {
  webcam: UseWebcamResult;
};

function permissionTone(permissionState: UseWebcamResult["permissionState"]) {
  if (permissionState === "granted") return "online" as const;
  if (permissionState === "prompt" || permissionState === "unknown") return "pending" as const;
  if (permissionState === "denied" || permissionState === "unsupported") return "warning" as const;
  return "offline" as const;
}

function activeTone(isActive: boolean) {
  return isActive ? ("online" as const) : ("offline" as const);
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-zinc-800 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="max-w-[13rem] text-right text-sm font-medium text-zinc-200">{value}</dd>
    </div>
  );
}

function WebcamAdvice({ webcam }: WebcamDiagnosticsProps) {
  if (webcam.errorType === "permission_denied" || webcam.permissionState === "denied") {
    return (
      <div className="flex gap-3 rounded-lg border border-rose-400/25 bg-rose-400/10 p-3 text-rose-100">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
        <p>
          Click the browser lock or sliders icon near the address bar, set Camera to Allow,
          reload the page, then try Start Camera again.
        </p>
      </div>
    );
  }

  if (webcam.errorType === "busy") {
    return (
      <div className="flex gap-3 rounded-lg border border-amber-400/25 bg-amber-400/10 p-3 text-amber-100">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
        <p>
          Close other camera apps or tabs, including Zoom, Teams, OBS, Windows Camera,
          and other local projects, then retry the camera.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <Activity className="mt-0.5 h-4 w-4 flex-none text-amber-300" aria-hidden="true" />
      <p>MediaPipe tracking can read this local preview. Final scoring remains deferred.</p>
    </div>
  );
}

export function WebcamDiagnostics({ webcam }: WebcamDiagnosticsProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-400">Camera diagnostics</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Webcam readiness</h2>
        </div>
        <MonitorCheck className="h-5 w-5 text-cyan-300" aria-hidden="true" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge
          label={webcam.isSupported ? "mediaDevices ready" : "unsupported"}
          tone={webcam.isSupported ? "online" : "warning"}
        />
        <StatusBadge
          label={webcam.permissionState}
          tone={permissionTone(webcam.permissionState)}
        />
        <StatusBadge
          label={webcam.isActive ? "active" : "inactive"}
          tone={activeTone(webcam.isActive)}
        />
      </div>

      <dl className="mt-5">
        <DiagnosticRow
          label="Frontend origin"
          value={webcam.diagnostics.frontendOrigin}
        />
        <DiagnosticRow
          label="Browser support"
          value={webcam.diagnostics.isBrowserSupported ? "Supported" : "Unsupported"}
        />
        <DiagnosticRow
          label="Permission"
          value={webcam.permissionState}
        />
        <DiagnosticRow
          label="Last error name"
          value={webcam.lastErrorName ?? "None"}
        />
        <DiagnosticRow
          label="Stream exists"
          value={webcam.diagnostics.hasStream ? "Yes" : "No"}
        />
        <DiagnosticRow
          label="Track count"
          value={String(webcam.diagnostics.trackCount)}
        />
        <DiagnosticRow
          label="Detected cameras"
          value={String(webcam.devices.length)}
        />
        <DiagnosticRow
          label="Selected device ID"
          value={webcam.diagnostics.selectedDeviceId}
        />
        <DiagnosticRow
          label="Selected camera"
          value={webcam.diagnostics.selectedDeviceLabel}
        />
        <DiagnosticRow
          label="Track state"
          value={webcam.diagnostics.videoTrackReadyState}
        />
        <DiagnosticRow
          label="Resolution"
          value={webcam.diagnostics.resolution}
        />
        <DiagnosticRow
          label="Frame rate"
          value={webcam.diagnostics.frameRate}
        />
      </dl>

      <div className="mt-5 grid gap-3 text-sm leading-6 text-zinc-400">
        <div className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <Camera className="mt-0.5 h-4 w-4 flex-none text-cyan-300" aria-hidden="true" />
          <p>The browser may ask for camera permission when preview starts.</p>
        </div>
        <div className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <SlidersHorizontal className="mt-0.5 h-4 w-4 flex-none text-zinc-300" aria-hidden="true" />
          <p>
            If permission is blocked, click the browser lock or sliders icon near the address bar,
            set Camera to Allow, and reload this page.
          </p>
        </div>
        <div className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <Video className="mt-0.5 h-4 w-4 flex-none text-zinc-300" aria-hidden="true" />
          <p>Task 5 analyzes video locally only. Microphone and recording remain off.</p>
        </div>
        <WebcamAdvice webcam={webcam} />
      </div>
    </Card>
  );
}

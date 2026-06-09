import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type WebcamPermissionState =
  | "unknown"
  | "prompt"
  | "granted"
  | "denied"
  | "unsupported";

export type WebcamStatus = "unsupported" | "inactive" | "starting" | "active" | "error";
export type WebcamErrorType =
  | "permission_denied"
  | "not_found"
  | "busy"
  | "constraint"
  | "unsupported"
  | "unknown";

export type WebcamDiagnostics = {
  frontendOrigin: string;
  isBrowserSupported: boolean;
  selectedDeviceId: string;
  selectedDeviceLabel: string;
  hasStream: boolean;
  trackCount: number;
  videoTrackReadyState: MediaStreamTrackState | "inactive";
  resolution: string;
  frameRate: string;
  videoInputCount: number;
};

export type UseWebcamResult = {
  stream: MediaStream | null;
  isSupported: boolean;
  isStarting: boolean;
  isActive: boolean;
  permissionState: WebcamPermissionState;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string | null;
  error: string | null;
  errorType: WebcamErrorType | null;
  lastErrorName: string | null;
  status: WebcamStatus;
  diagnostics: WebcamDiagnostics;
  checkSupport: () => boolean;
  loadDevices: () => Promise<MediaDeviceInfo[]>;
  startCamera: (deviceId?: string) => Promise<void>;
  stopCamera: () => void;
  switchCamera: (deviceId: string) => Promise<void>;
  resetDevice: () => Promise<void>;
  clearError: () => void;
};

const FALLBACK_ERROR_NAMES = new Set([
  "NotReadableError",
  "TrackStartError",
  "OverconstrainedError",
  "ConstraintNotSatisfiedError",
  "AbortError",
]);

const HARD_FAIL_ERROR_NAMES = new Set([
  "NotAllowedError",
  "SecurityError",
  "NotFoundError",
  "DevicesNotFoundError",
]);

function hasMediaDeviceSupport() {
  return Boolean(
    typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function" &&
      typeof navigator.mediaDevices.enumerateDevices === "function",
  );
}

function cameraErrorDetails(error: unknown): { message: string; type: WebcamErrorType } {
  if (!(error instanceof DOMException)) {
    return {
      message: "Camera access failed. Check your browser settings and try again.",
      type: "unknown",
    };
  }

  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return {
        message:
          "Camera permission was denied. Enable camera access in your browser settings and try again.",
        type: "permission_denied",
      };
    case "NotFoundError":
    case "DevicesNotFoundError":
      return {
        message: "No camera device was found.",
        type: "not_found",
      };
    case "NotReadableError":
    case "TrackStartError":
      return {
        message:
          "Camera may be in use by another app, browser tab, Zoom, Teams, OBS, Windows Camera, or another local project. Close other camera apps and try again.",
        type: "busy",
      };
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return {
        message:
          "The selected camera could not be started. Choose another camera and try again.",
        type: "constraint",
      };
    default:
      return {
        message:
          error.message || "Camera access failed. Check your browser settings and try again.",
        type: "unknown",
      };
  }
}

function permissionFromError(error: unknown): WebcamPermissionState {
  if (error instanceof DOMException && ["NotAllowedError", "SecurityError"].includes(error.name)) {
    return "denied";
  }

  return "unknown";
}

function stopStreamTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function useWebcam(): UseWebcamResult {
  const streamRef = useRef<MediaStream | null>(null);
  const permissionStatusRef = useRef<PermissionStatus | null>(null);
  const startRequestIdRef = useRef(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isSupported, setIsSupported] = useState(() => hasMediaDeviceSupport());
  const [isStarting, setIsStarting] = useState(false);
  const [permissionState, setPermissionState] =
    useState<WebcamPermissionState>("unknown");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<WebcamErrorType | null>(null);
  const [lastErrorName, setLastErrorName] = useState<string | null>(null);

  const checkSupport = useCallback(() => {
    const supported = hasMediaDeviceSupport();
    setIsSupported(supported);
    setPermissionState((current) => (supported ? current : "unsupported"));
    return supported;
  }, []);

  const loadDevices = useCallback(async () => {
    if (!checkSupport()) {
      setDevices([]);
      return [];
    }

    try {
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = mediaDevices.filter((device) => device.kind === "videoinput");
      setDevices(videoDevices);
      setSelectedDeviceId((current) => {
        if (current && videoDevices.some((device) => device.deviceId === current)) {
          return current;
        }

        return videoDevices.find((device) => device.deviceId)?.deviceId ?? null;
      });
      return videoDevices;
    } catch {
      setDevices([]);
      return [];
    }
  }, [checkSupport]);

  const stopCamera = useCallback(() => {
    startRequestIdRef.current += 1;
    stopStreamTracks(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setIsStarting(false);
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      if (!checkSupport()) {
        setError("This browser does not support camera access.");
        setErrorType("unsupported");
        setLastErrorName(null);
        setPermissionState("unsupported");
        return;
      }

      setIsStarting(true);
      setError(null);
      setErrorType(null);
      setLastErrorName(null);
      const requestId = startRequestIdRef.current + 1;
      startRequestIdRef.current = requestId;
      stopStreamTracks(streamRef.current);
      streamRef.current = null;
      setStream(null);

      const requestedDeviceId = deviceId || selectedDeviceId || undefined;
      const attempts: MediaStreamConstraints[] = [];
      if (requestedDeviceId) {
        attempts.push({
          audio: false,
          video: { deviceId: { exact: requestedDeviceId } },
        });
      }
      attempts.push({ audio: false, video: true });
      attempts.push({
        audio: false,
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 },
        },
      });

      const failStart = (cameraError: unknown) => {
        stopStreamTracks(streamRef.current);
        streamRef.current = null;
        setStream(null);
        const details = cameraErrorDetails(cameraError);
        setError(details.message);
        setErrorType(details.type);
        setLastErrorName(
          cameraError instanceof DOMException ? cameraError.name : null,
        );
        setPermissionState(permissionFromError(cameraError));
      };

      let nextStream: MediaStream | null = null;
      let lastError: unknown = null;

      try {
        for (const constraints of attempts) {
          try {
            const candidate = await navigator.mediaDevices.getUserMedia(constraints);

            if (requestId !== startRequestIdRef.current) {
              stopStreamTracks(candidate);
              return;
            }

            nextStream = candidate;
            lastError = null;
            break;
          } catch (attemptError) {
            lastError = attemptError;
            const name =
              attemptError instanceof DOMException ? attemptError.name : "";

            if (HARD_FAIL_ERROR_NAMES.has(name)) {
              break;
            }

            if (!FALLBACK_ERROR_NAMES.has(name)) {
              break;
            }
          }
        }

        if (requestId !== startRequestIdRef.current) {
          if (nextStream) {
            stopStreamTracks(nextStream);
          }
          return;
        }

        if (!nextStream) {
          failStart(lastError ?? new Error("Camera could not start."));
          return;
        }

        streamRef.current = nextStream;
        setStream(nextStream);
        setPermissionState("granted");
        const activeTrack = nextStream.getVideoTracks()[0];

        if (!activeTrack) {
          stopStreamTracks(nextStream);
          streamRef.current = null;
          setStream(null);
          setError("No camera device was found.");
          setErrorType("not_found");
          setLastErrorName(null);
          return;
        }

        const settings = activeTrack.getSettings();
        setSelectedDeviceId(settings.deviceId ?? requestedDeviceId ?? null);
        const acquiredStream = nextStream;
        activeTrack.onended = () => {
          if (streamRef.current === acquiredStream) {
            streamRef.current = null;
            setStream(null);
          }
        };

        await loadDevices();
      } finally {
        if (requestId === startRequestIdRef.current) {
          setIsStarting(false);
        }
      }
    },
    [checkSupport, loadDevices, selectedDeviceId],
  );

  const resetDevice = useCallback(async () => {
    startRequestIdRef.current += 1;
    stopStreamTracks(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setIsStarting(false);
    setSelectedDeviceId(null);
    setError(null);
    setErrorType(null);
    setLastErrorName(null);
    await loadDevices();
  }, [loadDevices]);

  const switchCamera = useCallback(
    async (deviceId: string) => {
      setSelectedDeviceId(deviceId);

      if (streamRef.current) {
        await startCamera(deviceId);
      }
    },
    [startCamera],
  );

  const clearError = useCallback(() => {
    setError(null);
    setErrorType(null);
    setLastErrorName(null);
  }, []);

  useEffect(() => {
    if (!checkSupport()) return undefined;

    loadDevices();

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "camera" as PermissionName })
        .then((status) => {
          permissionStatusRef.current = status;
          setPermissionState(status.state as WebcamPermissionState);
          status.onchange = () => setPermissionState(status.state as WebcamPermissionState);
        })
        .catch(() => {
          setPermissionState((current) => (current === "unknown" ? "prompt" : current));
        });
    } else {
      setPermissionState("prompt");
    }

    const handleDeviceChange = () => {
      loadDevices();
    };

    navigator.mediaDevices.addEventListener?.("devicechange", handleDeviceChange);

    return () => {
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null;
      }

      navigator.mediaDevices.removeEventListener?.("devicechange", handleDeviceChange);
      stopStreamTracks(streamRef.current);
      streamRef.current = null;
    };
  }, [checkSupport, loadDevices]);

  const isActive = Boolean(stream?.getVideoTracks().some((track) => track.readyState === "live"));

  const diagnostics = useMemo<WebcamDiagnostics>(() => {
    const track = stream?.getVideoTracks()[0] ?? null;
    const tracks = stream?.getVideoTracks() ?? [];
    const settings = track?.getSettings();
    const selectedDevice = devices.find((device) => device.deviceId === selectedDeviceId);
    const width = settings?.width;
    const height = settings?.height;
    const frameRate = settings?.frameRate;

    return {
      frontendOrigin:
        typeof window !== "undefined" ? window.location.origin : "Unavailable",
      isBrowserSupported: isSupported,
      selectedDeviceId: selectedDeviceId || "Unavailable",
      selectedDeviceLabel:
        selectedDevice?.label ||
        (selectedDeviceId ? "Camera selected" : devices[0]?.label || "No camera selected"),
      hasStream: Boolean(stream),
      trackCount: tracks.length,
      videoTrackReadyState: track?.readyState ?? "inactive",
      resolution: width && height ? `${width} x ${height}` : "Unavailable",
      frameRate: frameRate ? `${Math.round(frameRate)} fps` : "Unavailable",
      videoInputCount: devices.length,
    };
  }, [devices, isSupported, selectedDeviceId, stream]);

  const status: WebcamStatus = !isSupported
    ? "unsupported"
    : error
      ? "error"
      : isStarting
        ? "starting"
        : isActive
          ? "active"
          : "inactive";

  return {
    stream,
    isSupported,
    isStarting,
    isActive,
    permissionState,
    devices,
    selectedDeviceId,
    error,
    errorType,
    lastErrorName,
    status,
    diagnostics,
    checkSupport,
    loadDevices,
    startCamera,
    stopCamera,
    switchCamera,
    resetDevice,
    clearError,
  };
}

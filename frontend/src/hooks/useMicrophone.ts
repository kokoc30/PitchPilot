import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type MicrophonePermissionState =
  | "unknown"
  | "prompt"
  | "granted"
  | "denied"
  | "unsupported";

export type MicrophoneStatus =
  | "unsupported"
  | "inactive"
  | "starting"
  | "active"
  | "error";

export type MicrophoneErrorType =
  | "permission_denied"
  | "not_found"
  | "busy"
  | "constraint"
  | "unsupported"
  | "unknown";

export type MicrophoneDiagnostics = {
  isBrowserSupported: boolean;
  selectedDeviceId: string;
  selectedDeviceLabel: string;
  hasStream: boolean;
  trackCount: number;
  audioTrackReadyState: MediaStreamTrackState | "inactive";
  sampleRate: string;
  channelCount: string;
  audioInputCount: number;
};

export type UseMicrophoneResult = {
  stream: MediaStream | null;
  isSupported: boolean;
  isStarting: boolean;
  isActive: boolean;
  permissionState: MicrophonePermissionState;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string | null;
  error: string | null;
  errorType: MicrophoneErrorType | null;
  lastErrorName: string | null;
  status: MicrophoneStatus;
  audioLevel: number;
  sampleRate: number | null;
  channelCount: number | null;
  diagnostics: MicrophoneDiagnostics;
  checkSupport: () => boolean;
  loadDevices: () => Promise<MediaDeviceInfo[]>;
  startMicrophone: (deviceId?: string) => Promise<void>;
  stopMicrophone: () => void;
  switchMicrophone: (deviceId: string) => Promise<void>;
  resetMicrophoneDevice: () => Promise<void>;
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

function getAudioContextCtor():
  | (new (options?: AudioContextOptions) => AudioContext)
  | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    AudioContext?: new (options?: AudioContextOptions) => AudioContext;
    webkitAudioContext?: new (options?: AudioContextOptions) => AudioContext;
  };
  return win.AudioContext ?? win.webkitAudioContext ?? null;
}

function microphoneErrorDetails(error: unknown): {
  message: string;
  type: MicrophoneErrorType;
} {
  if (!(error instanceof DOMException)) {
    return {
      message:
        "Microphone access failed. Check your browser settings and try again.",
      type: "unknown",
    };
  }

  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return {
        message:
          "Microphone permission was denied. Enable microphone access in your browser settings and try again.",
        type: "permission_denied",
      };
    case "NotFoundError":
    case "DevicesNotFoundError":
      return {
        message: "No microphone device was found.",
        type: "not_found",
      };
    case "NotReadableError":
    case "TrackStartError":
      return {
        message:
          "Microphone may be in use by another app such as Zoom, Teams, OBS, Discord, or another browser tab. Close other audio apps and try again.",
        type: "busy",
      };
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return {
        message:
          "The selected microphone could not be started. Choose another microphone and try again.",
        type: "constraint",
      };
    default:
      return {
        message:
          error.message ||
          "Microphone access failed. Check your browser settings and try again.",
        type: "unknown",
      };
  }
}

function permissionFromError(error: unknown): MicrophonePermissionState {
  if (
    error instanceof DOMException &&
    ["NotAllowedError", "SecurityError"].includes(error.name)
  ) {
    return "denied";
  }

  return "unknown";
}

function stopStreamTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function useMicrophone(): UseMicrophoneResult {
  const streamRef = useRef<MediaStream | null>(null);
  const permissionStatusRef = useRef<PermissionStatus | null>(null);
  const startRequestIdRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastLevelEmitRef = useRef(0);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isSupported, setIsSupported] = useState(() => hasMediaDeviceSupport());
  const [isStarting, setIsStarting] = useState(false);
  const [permissionState, setPermissionState] =
    useState<MicrophonePermissionState>("unknown");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<MicrophoneErrorType | null>(null);
  const [lastErrorName, setLastErrorName] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [sampleRate, setSampleRate] = useState<number | null>(null);
  const [channelCount, setChannelCount] = useState<number | null>(null);

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
      const audioDevices = mediaDevices.filter(
        (device) => device.kind === "audioinput",
      );
      setDevices(audioDevices);
      setSelectedDeviceId((current) => {
        if (current && audioDevices.some((device) => device.deviceId === current)) {
          return current;
        }

        return audioDevices.find((device) => device.deviceId)?.deviceId ?? null;
      });
      return audioDevices;
    } catch {
      setDevices([]);
      return [];
    }
  }, [checkSupport]);

  const teardownAnalyser = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    try {
      sourceRef.current?.disconnect();
    } catch {
      // ignore disconnect errors during teardown
    }
    sourceRef.current = null;

    try {
      analyserRef.current?.disconnect();
    } catch {
      // ignore disconnect errors during teardown
    }
    analyserRef.current = null;
    analyserBufferRef.current = null;

    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") {
      context.close().catch(() => undefined);
    }

    setAudioLevel(0);
  }, []);

  const setupAnalyser = useCallback(
    (mediaStream: MediaStream) => {
      teardownAnalyser();
      const AudioContextCtor = getAudioContextCtor();
      if (!AudioContextCtor) return;
      if (!mediaStream.getAudioTracks().length) return;

      let context: AudioContext;
      try {
        context = new AudioContextCtor();
      } catch {
        return;
      }
      audioContextRef.current = context;
      setSampleRate(context.sampleRate);

      let source: MediaStreamAudioSourceNode;
      try {
        source = context.createMediaStreamSource(mediaStream);
      } catch {
        teardownAnalyser();
        return;
      }
      sourceRef.current = source;

      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.6;
      analyserRef.current = analyser;
      analyserBufferRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      source.connect(analyser);

      const tick = () => {
        const analyserNode = analyserRef.current;
        const buffer = analyserBufferRef.current;
        if (!analyserNode || !buffer) return;
        analyserNode.getByteTimeDomainData(buffer);

        let sumSquares = 0;
        for (let index = 0; index < buffer.length; index += 1) {
          const normalized = (buffer[index] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / buffer.length);
        const boosted = Math.min(1, rms * 1.8);

        const now =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        if (now - lastLevelEmitRef.current >= 60) {
          lastLevelEmitRef.current = now;
          setAudioLevel(boosted);
        }

        animationFrameRef.current = requestAnimationFrame(tick);
      };
      animationFrameRef.current = requestAnimationFrame(tick);
    },
    [teardownAnalyser],
  );

  const stopMicrophone = useCallback(() => {
    startRequestIdRef.current += 1;
    teardownAnalyser();
    stopStreamTracks(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setIsStarting(false);
    setSampleRate(null);
    setChannelCount(null);
  }, [teardownAnalyser]);

  const startMicrophone = useCallback(
    async (deviceId?: string) => {
      if (!checkSupport()) {
        setError("This browser does not support microphone access.");
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
      teardownAnalyser();
      stopStreamTracks(streamRef.current);
      streamRef.current = null;
      setStream(null);

      const requestedDeviceId = deviceId || selectedDeviceId || undefined;
      const attempts: MediaStreamConstraints[] = [];
      if (requestedDeviceId) {
        attempts.push({
          video: false,
          audio: {
            deviceId: { exact: requestedDeviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }
      attempts.push({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      attempts.push({ video: false, audio: true });

      const failStart = (micError: unknown) => {
        stopStreamTracks(streamRef.current);
        streamRef.current = null;
        setStream(null);
        const details = microphoneErrorDetails(micError);
        setError(details.message);
        setErrorType(details.type);
        setLastErrorName(
          micError instanceof DOMException ? micError.name : null,
        );
        setPermissionState(permissionFromError(micError));
      };

      let nextStream: MediaStream | null = null;
      let lastError: unknown = null;

      try {
        for (const constraints of attempts) {
          try {
            const candidate = await navigator.mediaDevices.getUserMedia(
              constraints,
            );

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
          failStart(lastError ?? new Error("Microphone could not start."));
          return;
        }

        streamRef.current = nextStream;
        setStream(nextStream);
        setPermissionState("granted");
        const activeTrack = nextStream.getAudioTracks()[0];

        if (!activeTrack) {
          stopStreamTracks(nextStream);
          streamRef.current = null;
          setStream(null);
          setError("No microphone device was found.");
          setErrorType("not_found");
          setLastErrorName(null);
          return;
        }

        const settings = activeTrack.getSettings();
        setSelectedDeviceId(settings.deviceId ?? requestedDeviceId ?? null);
        setChannelCount(settings.channelCount ?? null);
        if (settings.sampleRate) {
          setSampleRate(settings.sampleRate);
        }

        const acquiredStream = nextStream;
        activeTrack.onended = () => {
          if (streamRef.current === acquiredStream) {
            teardownAnalyser();
            streamRef.current = null;
            setStream(null);
          }
        };

        setupAnalyser(nextStream);
        await loadDevices();
      } finally {
        if (requestId === startRequestIdRef.current) {
          setIsStarting(false);
        }
      }
    },
    [checkSupport, loadDevices, selectedDeviceId, setupAnalyser, teardownAnalyser],
  );

  const resetMicrophoneDevice = useCallback(async () => {
    startRequestIdRef.current += 1;
    teardownAnalyser();
    stopStreamTracks(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setIsStarting(false);
    setSelectedDeviceId(null);
    setError(null);
    setErrorType(null);
    setLastErrorName(null);
    setSampleRate(null);
    setChannelCount(null);
    await loadDevices();
  }, [loadDevices, teardownAnalyser]);

  const switchMicrophone = useCallback(
    async (deviceId: string) => {
      setSelectedDeviceId(deviceId);

      if (streamRef.current) {
        await startMicrophone(deviceId);
      }
    },
    [startMicrophone],
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
        .query({ name: "microphone" as PermissionName })
        .then((status) => {
          permissionStatusRef.current = status;
          setPermissionState(status.state as MicrophonePermissionState);
          status.onchange = () =>
            setPermissionState(status.state as MicrophonePermissionState);
        })
        .catch(() => {
          setPermissionState((current) =>
            current === "unknown" ? "prompt" : current,
          );
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

      navigator.mediaDevices.removeEventListener?.(
        "devicechange",
        handleDeviceChange,
      );
      teardownAnalyser();
      stopStreamTracks(streamRef.current);
      streamRef.current = null;
    };
  }, [checkSupport, loadDevices, teardownAnalyser]);

  const isActive = Boolean(
    stream?.getAudioTracks().some((track) => track.readyState === "live"),
  );

  const diagnostics = useMemo<MicrophoneDiagnostics>(() => {
    const track = stream?.getAudioTracks()[0] ?? null;
    const tracks = stream?.getAudioTracks() ?? [];
    const settings = track?.getSettings();
    const selectedDevice = devices.find(
      (device) => device.deviceId === selectedDeviceId,
    );

    return {
      isBrowserSupported: isSupported,
      selectedDeviceId: selectedDeviceId || "Unavailable",
      selectedDeviceLabel:
        selectedDevice?.label ||
        (selectedDeviceId
          ? "Microphone selected"
          : devices[0]?.label || "No microphone selected"),
      hasStream: Boolean(stream),
      trackCount: tracks.length,
      audioTrackReadyState: track?.readyState ?? "inactive",
      sampleRate: settings?.sampleRate
        ? `${settings.sampleRate} Hz`
        : sampleRate
          ? `${sampleRate} Hz`
          : "Unavailable",
      channelCount: settings?.channelCount
        ? String(settings.channelCount)
        : channelCount
          ? String(channelCount)
          : "Unavailable",
      audioInputCount: devices.length,
    };
  }, [channelCount, devices, isSupported, sampleRate, selectedDeviceId, stream]);

  const status: MicrophoneStatus = !isSupported
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
    audioLevel,
    sampleRate,
    channelCount,
    diagnostics,
    checkSupport,
    loadDevices,
    startMicrophone,
    stopMicrophone,
    switchMicrophone,
    resetMicrophoneDevice,
    clearError,
  };
}

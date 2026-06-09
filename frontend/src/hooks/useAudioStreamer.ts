import { useCallback, useEffect, useRef, useState } from "react";
import {
  createRealtimeSocket,
  WS_URL,
  type RealtimeMessage,
  type RealtimeSocketConnection,
} from "../lib/websocket";

export type AudioConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed"
  | "error";

export type UseAudioStreamerOptions = {
  stream: MediaStream | null;
  isMicrophoneActive: boolean;
  enabled?: boolean;
  url?: string;
  timesliceMs?: number;
  onAck?: (message: RealtimeMessage) => void;
};

export type AudioStreamerState = {
  connectionStatus: AudioConnectionStatus;
  isStreaming: boolean;
  chunksSent: number;
  bytesSent: number;
  lastAck: RealtimeMessage | null;
  lastError: string | null;
  selectedMimeType: string | null;
  isRecorderSupported: boolean;
  reconnectAttempts: number;
};

export type UseAudioStreamerResult = AudioStreamerState & {
  connect: () => void;
  disconnect: () => void;
  startStreaming: () => boolean;
  stopStreaming: () => void;
  sendPing: () => boolean;
  resetMetrics: () => void;
};

const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
];

function pickSupportedMimeType(): string | null {
  if (typeof window === "undefined") return null;
  const recorder = (window as unknown as { MediaRecorder?: typeof MediaRecorder })
    .MediaRecorder;
  if (!recorder || typeof recorder.isTypeSupported !== "function") {
    return null;
  }

  for (const candidate of CANDIDATE_MIME_TYPES) {
    if (recorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return "";
}

function hasMediaRecorderSupport() {
  return Boolean(
    typeof window !== "undefined" &&
      (window as unknown as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder,
  );
}

export function useAudioStreamer(
  options: UseAudioStreamerOptions,
): UseAudioStreamerResult {
  const {
    stream,
    isMicrophoneActive,
    enabled = true,
    url = WS_URL,
    timesliceMs = 750,
    onAck,
  } = options;

  const connectionRef = useRef<RealtimeSocketConnection | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const sessionIdRef = useRef(0);
  const onAckRef = useRef(onAck);
  const isStreamingRef = useRef(false);
  const wantConnectedRef = useRef(false);

  const [connectionStatus, setConnectionStatus] =
    useState<AudioConnectionStatus>("idle");
  const [isStreaming, setIsStreaming] = useState(false);
  const [chunksSent, setChunksSent] = useState(0);
  const [bytesSent, setBytesSent] = useState(0);
  const [lastAck, setLastAck] = useState<RealtimeMessage | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [selectedMimeType, setSelectedMimeType] = useState<string | null>(() =>
    hasMediaRecorderSupport() ? pickSupportedMimeType() : null,
  );
  const [isRecorderSupported] = useState(() => hasMediaRecorderSupport());
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    onAckRef.current = onAck;
  }, [onAck]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const stopRecorderInternal = useCallback((notifyBackend: boolean) => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // ignore stop errors
      }
    }

    if (isStreamingRef.current) {
      setIsStreaming(false);
      isStreamingRef.current = false;
      if (notifyBackend && connectionRef.current?.isOpen()) {
        connectionRef.current.sendJson({
          type: "audio_stop",
          sessionId: sessionIdRef.current,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, []);

  const handleMessage = useCallback((message: RealtimeMessage) => {
    setLastAck(message);
    onAckRef.current?.(message);
  }, []);

  const connect = useCallback(() => {
    if (connectionRef.current?.isOpen()) return;
    if (connectionStatus === "connecting") return;

    wantConnectedRef.current = true;
    clearReconnectTimer();
    setConnectionStatus("connecting");
    setLastError(null);

    const connection = createRealtimeSocket(
      {
        onOpen: () => {
          setConnectionStatus("connected");
          setReconnectAttempts(0);
        },
        onMessage: handleMessage,
        onError: () => {
          setConnectionStatus("error");
          setLastError("Audio WebSocket error. Confirm the backend is running.");
        },
        onClose: () => {
          stopRecorderInternal(false);
          if (wantConnectedRef.current) {
            setConnectionStatus("reconnecting");
            setReconnectAttempts((current) => current + 1);
            clearReconnectTimer();
            reconnectTimerRef.current = window.setTimeout(() => {
              if (wantConnectedRef.current) {
                connect();
              }
            }, 2000);
          } else {
            setConnectionStatus("closed");
          }
          connectionRef.current = null;
        },
      },
      url,
    );

    connectionRef.current = connection;
  }, [
    clearReconnectTimer,
    connectionStatus,
    handleMessage,
    stopRecorderInternal,
    url,
  ]);

  const disconnect = useCallback(() => {
    wantConnectedRef.current = false;
    clearReconnectTimer();
    stopRecorderInternal(true);

    const connection = connectionRef.current;
    connectionRef.current = null;
    connection?.close();
    setConnectionStatus("closed");
  }, [clearReconnectTimer, stopRecorderInternal]);

  const startStreaming = useCallback((): boolean => {
    if (!stream || !isMicrophoneActive) {
      setLastError("Start the microphone before streaming audio.");
      return false;
    }

    if (!hasMediaRecorderSupport()) {
      setLastError("MediaRecorder is not supported in this browser.");
      return false;
    }

    const connection = connectionRef.current;
    if (!connection || !connection.isOpen()) {
      setLastError("Audio WebSocket is not connected.");
      return false;
    }

    if (isStreamingRef.current) {
      return true;
    }

    const mimeType = pickSupportedMimeType();
    setSelectedMimeType(mimeType);

    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create MediaRecorder.";
      setLastError(message);
      return false;
    }

    recorderRef.current = recorder;
    sessionIdRef.current += 1;
    setChunksSent(0);
    setBytesSent(0);
    setLastError(null);

    recorder.ondataavailable = async (event) => {
      const blob = event.data;
      if (!blob || blob.size === 0) return;
      const active = connectionRef.current;
      if (!active?.isOpen()) return;

      try {
        const buffer = await blob.arrayBuffer();
        const sent = active.sendBinary(buffer);
        if (sent) {
          setChunksSent((count) => count + 1);
          setBytesSent((total) => total + buffer.byteLength);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to send audio chunk.";
        setLastError(message);
      }
    };

    recorder.onerror = (event) => {
      const message =
        (event as unknown as { error?: { message?: string } }).error?.message ??
        "MediaRecorder error.";
      setLastError(message);
    };

    recorder.onstop = () => {
      if (recorderRef.current === recorder) {
        recorderRef.current = null;
      }
    };

    try {
      recorder.start(timesliceMs);
    } catch (error) {
      recorderRef.current = null;
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start MediaRecorder.";
      setLastError(message);
      return false;
    }

    setIsStreaming(true);
    isStreamingRef.current = true;

    connection.sendJson({
      type: "audio_start",
      sessionId: sessionIdRef.current,
      mimeType: mimeType ?? "default",
      timesliceMs,
      timestamp: new Date().toISOString(),
    });

    return true;
  }, [isMicrophoneActive, stream, timesliceMs]);

  const stopStreaming = useCallback(() => {
    stopRecorderInternal(true);
  }, [stopRecorderInternal]);

  const sendPing = useCallback((): boolean => {
    const connection = connectionRef.current;
    if (!connection?.isOpen()) return false;
    return connection.sendJson({
      type: "ping",
      timestamp: new Date().toISOString(),
    });
  }, []);

  const resetMetrics = useCallback(() => {
    setChunksSent(0);
    setBytesSent(0);
    setLastAck(null);
    setLastError(null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }

    connect();

    return () => {
      wantConnectedRef.current = false;
      clearReconnectTimer();
      stopRecorderInternal(false);
      connectionRef.current?.close();
      connectionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, url]);

  useEffect(() => {
    if (!isMicrophoneActive && isStreamingRef.current) {
      stopRecorderInternal(true);
    }
  }, [isMicrophoneActive, stopRecorderInternal]);

  return {
    connectionStatus,
    isStreaming,
    chunksSent,
    bytesSent,
    lastAck,
    lastError,
    selectedMimeType,
    isRecorderSupported,
    reconnectAttempts,
    connect,
    disconnect,
    startStreaming,
    stopStreaming,
    sendPing,
    resetMetrics,
  };
}

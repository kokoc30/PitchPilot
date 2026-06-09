const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/ws/realtime";

export type RealtimeMessage = Record<string, unknown>;

export type RealtimeSocketCallbacks = {
  onOpen?: () => void;
  onMessage?: (message: RealtimeMessage) => void;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
};

export type RealtimeBinaryPayload = ArrayBuffer | ArrayBufferView | Blob;

export type RealtimeSocketConnection = {
  socket: WebSocket;
  sendJson: (payload: RealtimeMessage) => boolean;
  sendBinary: (payload: RealtimeBinaryPayload) => boolean;
  isOpen: () => boolean;
  close: (code?: number, reason?: string) => void;
};

function parseMessage(data: string): RealtimeMessage {
  try {
    return JSON.parse(data) as RealtimeMessage;
  } catch {
    return { type: "raw", payload: data };
  }
}

function normalizeBinaryPayload(payload: RealtimeBinaryPayload): Blob | ArrayBuffer {
  if (payload instanceof Blob) {
    return payload;
  }

  if (payload instanceof ArrayBuffer) {
    return payload;
  }

  return new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength).slice().buffer;
}

export function createRealtimeSocket(
  callbacks: RealtimeSocketCallbacks = {},
  url: string = WS_URL,
): RealtimeSocketConnection {
  const socket = new WebSocket(url);
  socket.binaryType = "arraybuffer";

  socket.addEventListener("open", () => callbacks.onOpen?.());
  socket.addEventListener("message", (event) => {
    if (typeof event.data === "string") {
      callbacks.onMessage?.(parseMessage(event.data));
      return;
    }
    callbacks.onMessage?.({
      type: "binary",
      byteLength:
        event.data instanceof ArrayBuffer
          ? event.data.byteLength
          : event.data instanceof Blob
            ? event.data.size
            : 0,
    });
  });
  socket.addEventListener("error", (event) => callbacks.onError?.(event));
  socket.addEventListener("close", (event) => callbacks.onClose?.(event));

  return {
    socket,
    sendJson: (payload: RealtimeMessage) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
        return true;
      }

      return false;
    },
    sendBinary: (payload: RealtimeBinaryPayload) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(normalizeBinaryPayload(payload));
        return true;
      }

      return false;
    },
    isOpen: () => socket.readyState === WebSocket.OPEN,
    close: (code?: number, reason?: string) => {
      try {
        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          socket.close(code, reason);
        }
      } catch {
        // ignore close errors
      }
    },
  };
}

export { WS_URL };

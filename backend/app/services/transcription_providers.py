"""Transcription provider implementations.

Two providers are available:

* MockProvider  — generates deterministic placeholder text from received audio
  chunks. Useful for local development without any external API key.
* DeepgramProvider — streams audio to Deepgram's nova-2 model over a WebSocket
  and relays transcript events back to the caller. Requires DEEPGRAM_API_KEY.

Each provider exposes the same interface:
  - start(callback) -> None
  - send_audio(chunk: bytes) -> None
  - stop() -> None

The callback signature is:
  async def callback(event: dict) -> None
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any, Callable, Coroutine

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# Type alias for the async callback that receives transcript events
EventCallback = Callable[[dict[str, Any]], Coroutine[Any, Any, None]]


class BaseTranscriptionProvider(ABC):
    """Abstract base for all transcription providers."""

    provider_name: str = "base"

    @abstractmethod
    async def start(self, callback: EventCallback) -> None:
        """Initialize the provider and start accepting audio."""

    @abstractmethod
    async def send_audio(self, chunk: bytes) -> None:
        """Forward a raw audio chunk to the provider."""

    @abstractmethod
    async def stop(self) -> None:
        """Flush any pending transcript and release resources."""


# ---------------------------------------------------------------------------
# Mock provider
# ---------------------------------------------------------------------------

_MOCK_MESSAGES = [
    "Transcript preview active. Audio is being received.",
    "Realtime transcription running in demo mode.",
    "This is a mock transcript. Connect Deepgram for real speech-to-text.",
    "Audio chunks confirmed. Demo provider is responding.",
]


class MockTranscriptionProvider(BaseTranscriptionProvider):
    """Generates placeholder transcript events from audio chunk counts.

    Emits one interim event every 5 chunks and a final event on stop.
    """

    provider_name = "mock"

    def __init__(self) -> None:
        self._callback: EventCallback | None = None
        self._chunk_count = 0
        self._sequence = 0
        self._running = False
        self._msg_index = 0

    async def start(self, callback: EventCallback) -> None:
        self._callback = callback
        self._chunk_count = 0
        self._sequence = 0
        self._running = True
        self._msg_index = 0
        logger.info("[mock] Transcription provider started")
        await callback(
            {
                "type": "transcript_status",
                "status": "listening",
                "provider": "mock",
                "message": "Mock transcript provider active. Audio is being received.",
            }
        )

    async def send_audio(self, chunk: bytes) -> None:
        if not self._running or self._callback is None:
            return

        self._chunk_count += 1

        # Emit an interim event every 5 chunks
        if self._chunk_count % 5 == 0:
            msg = _MOCK_MESSAGES[self._msg_index % len(_MOCK_MESSAGES)]
            self._sequence += 1
            await self._callback(
                {
                    "type": "transcript_interim",
                    "text": msg,
                    "is_final": False,
                    "confidence": None,
                    "start_ms": None,
                    "end_ms": None,
                    "provider": "mock",
                    "sequence": self._sequence,
                }
            )
            self._msg_index += 1

    async def stop(self) -> None:
        if not self._running or self._callback is None:
            self._running = False
            return

        self._running = False
        self._sequence += 1
        await self._callback(
            {
                "type": "transcript_final",
                "text": "Mock transcription session ended. Start Deepgram for real speech-to-text.",
                "is_final": True,
                "confidence": None,
                "start_ms": None,
                "end_ms": None,
                "provider": "mock",
                "sequence": self._sequence,
            }
        )
        logger.info("[mock] Transcription provider stopped after %d chunks", self._chunk_count)


# ---------------------------------------------------------------------------
# Deepgram provider
# ---------------------------------------------------------------------------

_DEEPGRAM_WS_URL = (
    "wss://api.deepgram.com/v1/listen"
    "?model=nova-2"
    "&encoding=webm-opus"
    "&sample_rate=48000"
    "&channels=1"
    "&interim_results=true"
    "&punctuate=true"
    "&language=en-US"
)


class DeepgramTranscriptionProvider(BaseTranscriptionProvider):
    """Streams audio to Deepgram's nova-2 model via a keep-alive WebSocket.

    The provider forwards raw WebM/Opus chunks (as sent by MediaRecorder)
    directly to Deepgram and relays transcript events back via the callback.

    Requires the ``websockets`` package (>=12) which is already bundled with
    the ``fastapi[standard]`` / ``uvicorn[standard]`` dependency set. If not
    available, a clear error is raised on start.
    """

    provider_name = "deepgram"

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key
        self._callback: EventCallback | None = None
        self._ws: Any = None  # websockets.WebSocketClientProtocol
        self._recv_task: asyncio.Task[None] | None = None
        self._sequence = 0
        self._running = False

    async def start(self, callback: EventCallback) -> None:
        self._callback = callback
        self._running = True

        try:
            import websockets  # type: ignore[import-untyped]
        except ImportError as exc:
            msg = "websockets package is not installed. Add it to requirements.txt."
            logger.error("[deepgram] %s", msg)
            await callback(
                {
                    "type": "transcript_error",
                    "error": msg,
                    "provider": "deepgram",
                }
            )
            self._running = False
            raise RuntimeError(msg) from exc

        try:
            logger.info("[deepgram] Connecting to Deepgram realtime API…")
            self._ws = await websockets.connect(
                _DEEPGRAM_WS_URL,
                extra_headers={"Authorization": f"Token {self._api_key}"},
                open_timeout=10,
            )
        except Exception as exc:  # noqa: BLE001
            msg = f"Deepgram connection failed: {exc}"
            logger.error("[deepgram] %s", msg)
            await callback(
                {
                    "type": "transcript_error",
                    "error": msg,
                    "provider": "deepgram",
                }
            )
            self._running = False
            return

        await callback(
            {
                "type": "transcript_status",
                "status": "listening",
                "provider": "deepgram",
                "message": "Deepgram realtime transcription active.",
            }
        )

        # Start background receive loop
        self._recv_task = asyncio.create_task(self._receive_loop())

    async def _receive_loop(self) -> None:
        """Read transcript responses from Deepgram and fire callback."""
        try:
            async for raw in self._ws:
                if not self._running:
                    break
                try:
                    msg = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                msg_type = msg.get("type", "")
                if msg_type == "Results":
                    channel = msg.get("channel", {})
                    alternatives = channel.get("alternatives", [])
                    if not alternatives:
                        continue

                    best = alternatives[0]
                    text = best.get("transcript", "").strip()
                    if not text:
                        continue

                    is_final: bool = msg.get("is_final", False)
                    confidence: float | None = best.get("confidence")
                    start_ms: float | None = msg.get("start") * 1000 if msg.get("start") is not None else None
                    duration: float | None = msg.get("duration")
                    end_ms: float | None = (
                        (msg["start"] + duration) * 1000
                        if msg.get("start") is not None and duration is not None
                        else None
                    )

                    self._sequence += 1
                    event_type = "transcript_final" if is_final else "transcript_interim"

                    if self._callback:
                        await self._callback(
                            {
                                "type": event_type,
                                "text": text,
                                "is_final": is_final,
                                "confidence": confidence,
                                "start_ms": start_ms,
                                "end_ms": end_ms,
                                "provider": "deepgram",
                                "sequence": self._sequence,
                            }
                        )

                elif msg_type == "Metadata":
                    logger.debug("[deepgram] Metadata: %s", msg)

                elif msg_type == "SpeechStarted":
                    if self._callback:
                        await self._callback(
                            {
                                "type": "transcript_status",
                                "status": "transcribing",
                                "provider": "deepgram",
                                "message": "Speech detected.",
                            }
                        )

                elif msg_type == "UtteranceEnd":
                    logger.debug("[deepgram] Utterance ended")

                elif msg_type == "Error":
                    err = msg.get("description", "Unknown Deepgram error")
                    logger.error("[deepgram] Error from API: %s", err)
                    if self._callback:
                        await self._callback(
                            {
                                "type": "transcript_error",
                                "error": f"Deepgram error: {err}",
                                "provider": "deepgram",
                            }
                        )

        except Exception as exc:  # noqa: BLE001
            if self._running:
                logger.warning("[deepgram] Receive loop ended: %s", exc)
                if self._callback:
                    await self._callback(
                        {
                            "type": "transcript_error",
                            "error": f"Deepgram stream closed unexpectedly: {exc}",
                            "provider": "deepgram",
                        }
                    )

    async def send_audio(self, chunk: bytes) -> None:
        if not self._running or self._ws is None:
            return
        try:
            await self._ws.send(chunk)
        except Exception as exc:  # noqa: BLE001
            logger.warning("[deepgram] Failed to send audio chunk: %s", exc)

    async def stop(self) -> None:
        self._running = False

        # Send Deepgram CloseStream sentinel
        if self._ws is not None:
            try:
                await self._ws.send(json.dumps({"type": "CloseStream"}))
                # Give Deepgram a moment to flush
                await asyncio.sleep(0.5)
                await self._ws.close()
            except Exception:  # noqa: BLE001
                pass
            self._ws = None

        if self._recv_task is not None:
            self._recv_task.cancel()
            try:
                await self._recv_task
            except (asyncio.CancelledError, Exception):
                pass
            self._recv_task = None

        logger.info("[deepgram] Provider stopped")

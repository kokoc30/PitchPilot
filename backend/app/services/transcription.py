"""TranscriptionSession — provider selection and lifecycle facade.

Usage
-----
    session = TranscriptionSession(settings)
    await session.start(ws_send_callback)
    await session.send_audio(chunk)
    await session.stop()

The ``ws_send_callback`` receives fully-serialised dict payloads that the
caller should forward to the client WebSocket.
"""

from __future__ import annotations

import logging
from typing import Any, Callable, Coroutine

from app.services.transcription_providers import (
    BaseTranscriptionProvider,
    DeepgramTranscriptionProvider,
    MockTranscriptionProvider,
)
from app.utils.config import Settings

logger = logging.getLogger(__name__)

# Type alias
SendCallback = Callable[[dict[str, Any]], Coroutine[Any, Any, None]]


def _resolve_provider(settings: Settings) -> BaseTranscriptionProvider:
    """Select the appropriate provider based on environment configuration."""
    mode = (settings.transcription_provider or "auto").lower().strip()

    if mode == "mock":
        logger.info("[transcription] Provider forced to mock via TRANSCRIPTION_PROVIDER=mock")
        return MockTranscriptionProvider()

    if mode == "deepgram":
        if not settings.deepgram_api_key:
            msg = (
                "TRANSCRIPTION_PROVIDER=deepgram but DEEPGRAM_API_KEY is not set. "
                "Set DEEPGRAM_API_KEY in backend/.env or switch to TRANSCRIPTION_PROVIDER=mock."
            )
            logger.error("[transcription] %s", msg)
            raise ValueError(msg)
        logger.info("[transcription] Provider set to Deepgram (explicit)")
        return DeepgramTranscriptionProvider(api_key=settings.deepgram_api_key)

    # auto: prefer Deepgram if key exists, otherwise fall back to mock
    if settings.deepgram_api_key:
        logger.info("[transcription] Auto-selected Deepgram (DEEPGRAM_API_KEY present)")
        return DeepgramTranscriptionProvider(api_key=settings.deepgram_api_key)

    logger.info(
        "[transcription] Auto-selected mock provider "
        "(DEEPGRAM_API_KEY not set, set it to enable Deepgram)"
    )
    return MockTranscriptionProvider()


class TranscriptionSession:
    """Manages the lifecycle of a single transcription session.

    One session maps to one WebSocket connection.  The session is not
    reusable: create a new instance for each connection.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._provider: BaseTranscriptionProvider | None = None
        self._send: SendCallback | None = None
        self._started = False
        self._stopped = False

    @property
    def provider_name(self) -> str:
        if self._provider is None:
            return "none"
        return self._provider.provider_name

    async def start(self, send_callback: SendCallback) -> None:
        """Resolve the provider, wire the callback, and start the session."""
        if self._started:
            logger.warning("[transcription] Session already started; ignoring duplicate start")
            return

        self._send = send_callback
        self._started = True
        self._stopped = False

        try:
            self._provider = _resolve_provider(self._settings)
        except ValueError as exc:
            logger.error("[transcription] Provider resolution failed: %s", exc)
            await send_callback(
                {
                    "type": "transcript_error",
                    "error": str(exc),
                    "provider": "mock",
                }
            )
            # Degrade to mock so the session is still usable
            self._provider = MockTranscriptionProvider()

        await self._provider.start(send_callback)

    async def send_audio(self, chunk: bytes) -> None:
        """Forward a raw audio chunk to the active provider."""
        if self._stopped or self._provider is None:
            return
        try:
            await self._provider.send_audio(chunk)
        except Exception as exc:  # noqa: BLE001
            logger.warning("[transcription] send_audio error: %s", exc)

    async def stop(self) -> None:
        """Flush the provider and clean up resources."""
        if self._stopped or self._provider is None:
            self._stopped = True
            return

        self._stopped = True
        try:
            await self._provider.stop()
        except Exception as exc:  # noqa: BLE001
            logger.warning("[transcription] stop error: %s", exc)

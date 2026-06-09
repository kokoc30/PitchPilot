"""Realtime WebSocket endpoint.

Handles audio streaming with integrated transcription.

Message flow (client → server):
  ping          → pong
  audio_start   → audio_start_ack  + transcript_status
  binary frame  → audio_chunk_ack  + (transcript_interim periodically)
  audio_stop    → audio_stop_ack   + transcript_final (on flush)
  anything else → echo

Events sent to client by the transcription layer:
  transcript_status   — provider lifecycle events
  transcript_interim  — in-progress (non-final) text
  transcript_final    — committed transcript segment
  transcript_error    — non-fatal provider errors
  transcript_reset    — state reset signal
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from app.services.transcription import TranscriptionSession
from app.utils.config import get_settings

logger = logging.getLogger(__name__)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_payload(raw_text: str) -> dict[str, Any]:
    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError:
        return {"type": "raw_text", "payload": raw_text}

    if isinstance(payload, dict):
        return payload

    return {"type": "json_value", "payload": payload}


class AudioSessionState:
    """Tracks audio chunk counters for a single WebSocket connection."""

    def __init__(self) -> None:
        self.session_id: int | None = None
        self.is_streaming: bool = False
        self.chunk_count: int = 0
        self.total_bytes: int = 0
        self.mime_type: str | None = None
        self.timeslice_ms: int | None = None
        self.started_at: str | None = None
        self.last_chunk_at: str | None = None

    def start(self, payload: dict[str, Any]) -> None:
        self.session_id = payload.get("sessionId") if isinstance(payload, dict) else None
        self.is_streaming = True
        self.chunk_count = 0
        self.total_bytes = 0
        self.mime_type = payload.get("mimeType") if isinstance(payload, dict) else None
        self.timeslice_ms = (
            payload.get("timesliceMs") if isinstance(payload, dict) else None
        )
        self.started_at = _now()
        self.last_chunk_at = None

    def stop(self) -> dict[str, Any]:
        snapshot = {
            "sessionId": self.session_id,
            "chunkCount": self.chunk_count,
            "totalBytesReceived": self.total_bytes,
            "mimeType": self.mime_type,
            "timesliceMs": self.timeslice_ms,
            "startedAt": self.started_at,
            "lastChunkAt": self.last_chunk_at,
            "stoppedAt": _now(),
        }
        self.is_streaming = False
        return snapshot

    def record_chunk(self, byte_length: int) -> dict[str, Any]:
        self.chunk_count += 1
        self.total_bytes += byte_length
        self.last_chunk_at = _now()
        return {
            "chunkCount": self.chunk_count,
            "bytesReceived": byte_length,
            "totalBytesReceived": self.total_bytes,
            "sessionId": self.session_id,
        }


async def _handle_text_message(
    websocket: WebSocket,
    raw_text: str,
    session: AudioSessionState,
    transcription: TranscriptionSession,
) -> None:
    payload = _parse_payload(raw_text)
    message_type = payload.get("type") if isinstance(payload, dict) else None

    if message_type == "ping":
        await websocket.send_json(
            {
                "type": "pong",
                "status": "ok",
                "received": payload,
                "timestamp": _now(),
            }
        )
        return

    if message_type == "audio_start":
        session.start(payload)

        # Build send callback that routes transcript events to this client
        async def send_transcript(event: dict[str, Any]) -> None:
            try:
                await websocket.send_json(event)
            except Exception:  # noqa: BLE001
                pass

        await transcription.start(send_transcript)

        await websocket.send_json(
            {
                "type": "audio_start_ack",
                "status": "ok",
                "sessionId": session.session_id,
                "mimeType": session.mime_type,
                "timesliceMs": session.timeslice_ms,
                "transcriptionProvider": transcription.provider_name,
                "message": (
                    f"Audio streaming session started. "
                    f"Transcription provider: {transcription.provider_name}."
                ),
                "timestamp": _now(),
            }
        )
        return

    if message_type == "audio_stop":
        snapshot = session.stop()
        # Flush transcription provider (will emit transcript_final)
        await transcription.stop()
        await websocket.send_json(
            {
                "type": "audio_stop_ack",
                "status": "ok",
                **snapshot,
                "message": "Audio streaming session stopped.",
            }
        )
        return

    if message_type == "audio_metadata":
        await websocket.send_json(
            {
                "type": "audio_metadata_ack",
                "status": "ok",
                "received": payload,
                "timestamp": _now(),
            }
        )
        return

    await websocket.send_json(
        {
            "type": "echo",
            "status": "ok",
            "received": payload,
            "message": "Realtime echo. Audio streaming and transcription acknowledged separately.",
            "timestamp": _now(),
        }
    )


async def _handle_binary_message(
    websocket: WebSocket,
    data: bytes,
    session: AudioSessionState,
    transcription: TranscriptionSession,
) -> None:
    byte_length = len(data)
    if not session.is_streaming:
        # accept and count even if audio_start was missed (e.g. reconnect race)
        session.is_streaming = True
        if session.started_at is None:
            session.started_at = _now()

    metrics = session.record_chunk(byte_length)

    # Forward audio to transcription provider (non-blocking; errors are swallowed)
    await transcription.send_audio(data)

    await websocket.send_json(
        {
            "type": "audio_chunk_ack",
            "status": "ok",
            **metrics,
            "timestamp": _now(),
        }
    )


async def realtime_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    logger.info("Realtime WebSocket connected")
    session = AudioSessionState()
    settings = get_settings()
    transcription = TranscriptionSession(settings)

    await websocket.send_json(
        {
            "type": "connection",
            "status": "connected",
            "message": (
                "PitchPilot realtime socket connected. "
                "Audio streaming and transcription are available."
            ),
            "version": "0.3.0",
            "transcriptionProvider": settings.transcription_provider,
            "supports": [
                "ping",
                "audio_start",
                "audio_stop",
                "audio_metadata",
                "binary_audio",
                "transcript_status",
                "transcript_interim",
                "transcript_final",
                "transcript_error",
            ],
        }
    )

    try:
        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                break

            text_payload = message.get("text")
            bytes_payload = message.get("bytes")

            if text_payload is not None:
                await _handle_text_message(websocket, text_payload, session, transcription)
                continue

            if bytes_payload is not None:
                await _handle_binary_message(websocket, bytes_payload, session, transcription)
                continue
    except WebSocketDisconnect:
        logger.info("Realtime WebSocket disconnected")
    except Exception:  # noqa: BLE001
        logger.exception("Realtime WebSocket error")
    finally:
        # Always clean up transcription resources
        if session.is_streaming:
            logger.info(
                "Realtime session ended mid-stream: %s chunks, %s bytes",
                session.chunk_count,
                session.total_bytes,
            )
        try:
            await transcription.stop()
        except Exception:  # noqa: BLE001
            pass

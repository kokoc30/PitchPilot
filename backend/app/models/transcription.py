"""Pydantic models for transcript events exchanged over WebSocket."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


TranscriptProvider = Literal["deepgram", "mock"]
TranscriptStatus = Literal["idle", "connecting", "listening", "transcribing", "error", "stopped"]


class TranscriptStatusEvent(BaseModel):
    """Sent when the provider status changes."""

    type: Literal["transcript_status"] = "transcript_status"
    status: TranscriptStatus
    provider: TranscriptProvider
    message: str


class TranscriptInterimEvent(BaseModel):
    """Sent for every in-progress (non-final) transcript result."""

    type: Literal["transcript_interim"] = "transcript_interim"
    text: str
    is_final: bool = False
    confidence: float | None = None
    start_ms: float | None = None
    end_ms: float | None = None
    provider: TranscriptProvider
    sequence: int


class TranscriptFinalEvent(BaseModel):
    """Sent when the provider commits a transcript segment."""

    type: Literal["transcript_final"] = "transcript_final"
    text: str
    is_final: bool = True
    confidence: float | None = None
    start_ms: float | None = None
    end_ms: float | None = None
    provider: TranscriptProvider
    sequence: int


class TranscriptErrorEvent(BaseModel):
    """Sent when the provider encounters a non-fatal error."""

    type: Literal["transcript_error"] = "transcript_error"
    error: str
    provider: TranscriptProvider


class TranscriptResetEvent(BaseModel):
    """Sent to clear the frontend transcript state."""

    type: Literal["transcript_reset"] = "transcript_reset"
    provider: TranscriptProvider

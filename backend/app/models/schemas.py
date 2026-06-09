from typing import Any

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class DiagnosticsResponse(BaseModel):
    api: str
    websocket: str
    auth: str
    ai_providers: dict[str, str]
    database: str
    resume_rag: dict[str, str]
    environment: str


class AuthRequest(BaseModel):
    email: str
    password: str


class PlaceholderAuthResponse(BaseModel):
    status: str
    message: str
    email: str


class AuthenticatedUser(BaseModel):
    id: str
    email: str | None
    role: str | None
    claims: dict[str, Any]


class AuthMeResponse(BaseModel):
    authenticated: bool
    user: AuthenticatedUser


class RealtimeStatusResponse(BaseModel):
    status: str
    websocket_path: str
    message: str
    transcription_provider: str = "auto"
    effective_provider: str = "mock"
    audio_streaming_foundation: str = "available"
    metrics_engine_foundation: str = "available"
    scoring_engine_foundation: str = "frontend"
    scoring_supported: list[str] = [
        "clarity",
        "pace",
        "delivery",
        "engagement",
        "camera_facing",
        "overall",
    ]
    supported_messages: list[str] = [
        "ping",
        "audio_start",
        "audio_stop",
        "audio_metadata",
        "binary_audio",
    ]
    transcript_events: list[str] = [
        "transcript_status",
        "transcript_interim",
        "transcript_final",
        "transcript_error",
        "transcript_reset",
    ]
    notes: list[str] = [
        "Audio chunks are forwarded to the configured transcription provider.",
        "No audio is persisted to disk or database.",
        "Set DEEPGRAM_API_KEY and TRANSCRIPTION_PROVIDER=auto to enable Deepgram.",
        "Set TRANSCRIPTION_PROVIDER=mock to force mock mode.",
        "Metrics engine runs in browser using live transcripts, audio levels, and MediaPipe.",
        "Scoring engine runs in browser as deterministic local practice estimates.",
        "Task 11 coaching drafts are available at /api/coaching/draft by explicit request only.",
    ]

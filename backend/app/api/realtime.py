from fastapi import APIRouter

from app.models.schemas import RealtimeStatusResponse
from app.utils.config import get_settings

router = APIRouter(prefix="/realtime", tags=["realtime"])


@router.get("/status", response_model=RealtimeStatusResponse)
async def realtime_status() -> RealtimeStatusResponse:
    settings = get_settings()
    provider = settings.transcription_provider

    # Determine effective provider for the status message
    if provider == "mock":
        effective = "mock"
    elif provider == "deepgram":
        effective = "deepgram" if settings.deepgram_api_key else "error (key missing)"
    else:  # auto
        effective = "deepgram" if settings.deepgram_api_key else "mock"

    return RealtimeStatusResponse(
        status="available",
        websocket_path="/ws/realtime",
        transcription_provider=provider,
        effective_provider=effective,
        metrics_engine_foundation="available",
        scoring_engine_foundation="frontend",
        message=(
            f"Realtime WebSocket ready. Transcription provider: {effective}. "
            "Audio streaming, live transcription, metrics, and frontend scoring are active."
        ),
    )

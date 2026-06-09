from fastapi import APIRouter

from app.models.schemas import DiagnosticsResponse, HealthResponse
from app.services.diagnostics import build_diagnostics
from app.utils.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="pitchpilot-backend",
        version="0.1.0",
    )


@router.get("/api/diagnostics", response_model=DiagnosticsResponse)
async def diagnostics() -> DiagnosticsResponse:
    return build_diagnostics(get_settings())

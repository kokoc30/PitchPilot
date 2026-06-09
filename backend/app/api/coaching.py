from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.coaching import (
    CoachingDraftInput,
    CoachingDraftOutput,
    CoachingReportInput,
    CoachingReportOutput,
    CoachingStatusResponse,
)
from app.services.llm_orchestrator import (
    CoachingInputError,
    build_coaching_status,
    generate_coaching_draft,
    generate_coaching_report,
)
from app.services.llm_providers import (
    CoachingProviderConfigurationError,
    CoachingProviderError,
)
from app.utils.auth import require_current_user_claims

router = APIRouter(prefix="/coaching", tags=["coaching"])


@router.get("/status", response_model=CoachingStatusResponse)
async def coaching_status() -> CoachingStatusResponse:
    return build_coaching_status()


@router.post("/draft", response_model=CoachingDraftOutput)
async def coaching_draft(
    payload: CoachingDraftInput,
    _: dict[str, Any] = Depends(require_current_user_claims),
) -> CoachingDraftOutput:
    try:
        return await generate_coaching_draft(payload)
    except CoachingInputError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except CoachingProviderConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "provider_unavailable", "message": str(exc)},
        ) from exc
    except CoachingProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "provider_error", "message": str(exc)},
        ) from exc


@router.post("/report", response_model=CoachingReportOutput)
async def coaching_report(
    payload: CoachingReportInput,
    _: dict[str, Any] = Depends(require_current_user_claims),
) -> CoachingReportOutput:
    try:
        return await generate_coaching_report(payload)
    except CoachingInputError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except CoachingProviderConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "provider_unavailable", "message": str(exc)},
        ) from exc
    except CoachingProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "provider_error", "message": str(exc)},
        ) from exc

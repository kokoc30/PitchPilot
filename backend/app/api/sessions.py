from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.models.sessions import (
    DeleteSessionResponse,
    SaveSessionInput,
    SavedSessionDetail,
    SavedSessionsListResponse,
)
from app.services.session_persistence import (
    SessionNotFoundError,
    SessionPersistenceError,
    SessionPersistenceUnavailable,
    delete_practice_session,
    get_practice_session,
    list_practice_sessions,
    save_practice_session,
)
from app.utils.auth import require_current_user_claims, user_id_from_claims

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SavedSessionDetail)
async def create_session(
    payload: SaveSessionInput,
    claims: dict[str, Any] = Depends(require_current_user_claims),
) -> SavedSessionDetail:
    user_id = user_id_from_claims(claims)
    try:
        return await save_practice_session(user_id, payload)
    except SessionPersistenceUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "session_persistence_unavailable", "message": str(exc)},
        ) from exc
    except SessionPersistenceError as exc:
        raise HTTPException(
            status_code=_session_persistence_status(exc),
            detail={"code": "session_persistence_error", "message": str(exc)},
        ) from exc


@router.get("", response_model=SavedSessionsListResponse)
async def list_sessions(
    claims: dict[str, Any] = Depends(require_current_user_claims),
    limit: int = Query(default=20, ge=1, le=100),
) -> SavedSessionsListResponse:
    user_id = user_id_from_claims(claims)
    try:
        sessions = await list_practice_sessions(user_id, limit=limit)
        return SavedSessionsListResponse(sessions=sessions)
    except SessionPersistenceUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "session_persistence_unavailable", "message": str(exc)},
        ) from exc
    except SessionPersistenceError as exc:
        raise HTTPException(
            status_code=_session_persistence_status(exc),
            detail={"code": "session_persistence_error", "message": str(exc)},
        ) from exc


@router.get("/{session_id}", response_model=SavedSessionDetail)
async def get_session(
    session_id: str,
    claims: dict[str, Any] = Depends(require_current_user_claims),
) -> SavedSessionDetail:
    user_id = user_id_from_claims(claims)
    try:
        return await get_practice_session(user_id, session_id)
    except SessionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved session was not found.",
        ) from exc
    except SessionPersistenceUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "session_persistence_unavailable", "message": str(exc)},
        ) from exc
    except SessionPersistenceError as exc:
        raise HTTPException(
            status_code=_session_persistence_status(exc),
            detail={"code": "session_persistence_error", "message": str(exc)},
        ) from exc


@router.delete("/{session_id}", response_model=DeleteSessionResponse)
async def delete_session(
    session_id: str,
    claims: dict[str, Any] = Depends(require_current_user_claims),
) -> DeleteSessionResponse:
    user_id = user_id_from_claims(claims)
    try:
        await delete_practice_session(user_id, session_id)
        return DeleteSessionResponse(deleted=True, id=session_id)
    except SessionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved session was not found.",
        ) from exc
    except SessionPersistenceUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "session_persistence_unavailable", "message": str(exc)},
        ) from exc
    except SessionPersistenceError as exc:
        raise HTTPException(
            status_code=_session_persistence_status(exc),
            detail={"code": "session_persistence_error", "message": str(exc)},
        ) from exc


def _session_persistence_status(exc: SessionPersistenceError) -> int:
    if exc.status_code in {400, 401, 403, 404, 503}:
        return status.HTTP_503_SERVICE_UNAVAILABLE
    return status.HTTP_500_INTERNAL_SERVER_ERROR

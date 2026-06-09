from typing import Any

from fastapi import APIRouter, Depends

from app.models.schemas import AuthMeResponse, AuthRequest, AuthenticatedUser, PlaceholderAuthResponse
from app.utils.auth import require_current_user_claims

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=PlaceholderAuthResponse)
async def login(payload: AuthRequest) -> PlaceholderAuthResponse:
    return PlaceholderAuthResponse(
        status="placeholder",
        message="Login is handled by Supabase Auth on the frontend. Use /api/auth/me to verify bearer tokens.",
        email=payload.email,
    )


@router.post("/signup", response_model=PlaceholderAuthResponse)
async def signup(payload: AuthRequest) -> PlaceholderAuthResponse:
    return PlaceholderAuthResponse(
        status="placeholder",
        message="Signup is handled by Supabase Auth on the frontend. Use /api/auth/me to verify bearer tokens.",
        email=payload.email,
    )


@router.get("/me", response_model=AuthMeResponse)
async def get_me(
    claims: dict[str, Any] = Depends(require_current_user_claims),
) -> AuthMeResponse:
    return AuthMeResponse(
        authenticated=True,
        user=AuthenticatedUser(
            id=str(claims.get("sub", "")),
            email=claims.get("email"),
            role=claims.get("role"),
            claims=claims,
        ),
    )

from typing import Any
from uuid import UUID

import jwt
from fastapi import Header, HTTPException, status
from jwt import ExpiredSignatureError, InvalidTokenError, PyJWKClient, PyJWKClientError

from app.utils.config import get_settings


def _jwks_url() -> str | None:
    settings = get_settings()

    if not settings.supabase_url:
        return None

    return f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"


def _decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    header = jwt.get_unverified_header(token)
    algorithm = header.get("alg")

    if algorithm == "HS256":
        return jwt.decode(
            token,
            settings.auth_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )

    jwks_url = _jwks_url()

    if not jwks_url or not algorithm:
        raise InvalidTokenError("Unsupported token signing configuration.")

    signing_key = PyJWKClient(jwks_url).get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=[algorithm],
        options={"verify_aud": False},
    )


async def require_current_user_claims(
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization bearer token.",
        )

    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must use Bearer <token>.",
        )

    try:
        claims = _decode_token(token)
    except ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
        ) from exc
    except (InvalidTokenError, PyJWKClientError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        ) from exc

    if not isinstance(claims, dict):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token claims.",
        )

    return claims


def user_id_from_claims(claims: dict[str, Any]) -> str:
    raw_user_id = claims.get("sub")

    if not raw_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing a user id.",
        )

    try:
        return str(UUID(str(raw_user_id)))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has an invalid user id.",
        ) from exc

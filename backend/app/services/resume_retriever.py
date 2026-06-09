import math
from typing import Any, Literal

from app.models.resume_questions import ResumeRetrievedChunk
from app.services.resume_rag_store import (
    ResumeStoreError,
    ResumeStoreUnavailable,
    _request_json,  # type: ignore[attr-defined]
)
from app.utils.config import get_settings


RetrievalMethod = Literal["rpc", "python_fallback"]


class ResumeRetrievalError(Exception):
    def __init__(self, message: str, *, code: str = "resume_retrieval_error") -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def retrieve_resume_chunks(
    *,
    user_id: str,
    resume_id: str,
    query_embedding: list[float],
    top_k: int = 8,
) -> tuple[list[ResumeRetrievedChunk], RetrievalMethod]:
    """Return the top-K resume chunks for this user/resume by vector distance.

    Tries the Supabase RPC ``match_resume_chunks`` first; falls back to a
    Python-side cosine ranking over all chunks belonging to the resume if the
    RPC is unavailable (missing migration, older Supabase project, etc.).
    """
    settings = get_settings()
    if not settings.supabase_service_role_configured:
        raise ResumeStoreUnavailable(
            "Resume retrieval requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        )

    safe_top_k = max(1, min(int(top_k or 8), 24))

    try:
        rows = _request_json(
            "POST",
            "rpc/match_resume_chunks",
            body={
                "query_embedding": query_embedding,
                "match_user_id": user_id,
                "match_resume_id": resume_id,
                "match_count": safe_top_k,
            },
        )
        if isinstance(rows, list):
            return ([_chunk_from_rpc_row(row) for row in rows], "rpc")
    except ResumeStoreError:
        # Fall through to the Python fallback below.
        pass

    return (
        _python_fallback_retrieval(
            user_id=user_id,
            resume_id=resume_id,
            query_embedding=query_embedding,
            top_k=safe_top_k,
        ),
        "python_fallback",
    )


def _python_fallback_retrieval(
    *,
    user_id: str,
    resume_id: str,
    query_embedding: list[float],
    top_k: int,
) -> list[ResumeRetrievedChunk]:
    rows = _request_json(
        "GET",
        "resume_chunks",
        query={
            "select": "id,resume_id,chunk_index,content,metadata,embedding",
            "user_id": f"eq.{user_id}",
            "resume_id": f"eq.{resume_id}",
            "order": "chunk_index.asc",
            "limit": "200",
        },
    )
    if not isinstance(rows, list) or not rows:
        return []

    scored: list[tuple[float, dict[str, Any]]] = []
    for row in rows:
        embedding = _parse_embedding(row.get("embedding"))
        if embedding is None:
            continue
        similarity = _cosine_similarity(query_embedding, embedding)
        scored.append((similarity, row))

    scored.sort(key=lambda item: item[0], reverse=True)
    top_rows = scored[:top_k]
    return [_chunk_from_fallback(row, similarity) for similarity, row in top_rows]


def _chunk_from_rpc_row(row: dict[str, Any]) -> ResumeRetrievedChunk:
    similarity = _to_float(row.get("similarity"))
    distance = _to_float(row.get("distance"))
    if similarity is None and distance is not None:
        similarity = 1.0 - distance
    return ResumeRetrievedChunk(
        id=str(row.get("id")),
        resumeId=str(row.get("resume_id")),
        chunkIndex=int(row.get("chunk_index") or 0),
        content=str(row.get("content") or ""),
        metadata=row.get("metadata") or {},
        similarity=similarity,
        distance=distance,
    )


def _chunk_from_fallback(row: dict[str, Any], similarity: float) -> ResumeRetrievedChunk:
    return ResumeRetrievedChunk(
        id=str(row.get("id")),
        resumeId=str(row.get("resume_id")),
        chunkIndex=int(row.get("chunk_index") or 0),
        content=str(row.get("content") or ""),
        metadata=row.get("metadata") or {},
        similarity=similarity,
        distance=max(0.0, 1.0 - similarity),
    )


def _parse_embedding(raw: Any) -> list[float] | None:
    if raw is None:
        return None
    if isinstance(raw, list):
        try:
            return [float(value) for value in raw]
        except (TypeError, ValueError):
            return None
    if isinstance(raw, str):
        text = raw.strip()
        if not text:
            return None
        if text.startswith("[") and text.endswith("]"):
            text = text[1:-1]
        try:
            return [float(part) for part in text.split(",") if part.strip()]
        except ValueError:
            return None
    return None


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    norm_a = 0.0
    norm_b = 0.0
    for x, y in zip(a, b):
        dot += x * y
        norm_a += x * x
        norm_b += y * y
    if norm_a <= 0.0 or norm_b <= 0.0:
        return 0.0
    return dot / (math.sqrt(norm_a) * math.sqrt(norm_b))


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None

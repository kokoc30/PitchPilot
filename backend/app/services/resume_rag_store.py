import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.models.resume import (
    ResumeChunkPreview,
    ResumeDocumentDetail,
    ResumeDocumentSummary,
)
from app.services.resume_chunker import ResumeTextChunk
from app.utils.config import get_settings


class ResumeStoreUnavailable(Exception):
    pass


class ResumeStoreError(Exception):
    def __init__(
        self,
        message: str,
        *,
        code: str = "resume_store_error",
        status_code: int | None = None,
        technical_detail: str | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.technical_detail = technical_detail


class ResumeNotFoundError(Exception):
    pass


def create_resume_document(
    *,
    user_id: str,
    filename: str,
    file_type: str,
    file_size_bytes: int,
    text_char_count: int,
    chunk_count: int,
    embedding_model: str,
) -> ResumeDocumentSummary:
    row = _insert_one(
        "resume_documents",
        {
            "user_id": user_id,
            "filename": filename,
            "file_type": file_type,
            "file_size_bytes": file_size_bytes,
            "text_char_count": text_char_count,
            "chunk_count": chunk_count,
            "embedding_model": embedding_model,
            "status": "processed",
        },
    )
    return _summary_from_row(row)


def insert_resume_chunks(
    *,
    user_id: str,
    resume_id: str,
    chunks: list[ResumeTextChunk],
    embeddings: list[list[float]],
) -> None:
    if len(chunks) != len(embeddings):
        raise ResumeStoreError(
            "Chunk and embedding counts do not match.",
            code="resume_chunk_embedding_mismatch",
        )

    rows = []
    for chunk, embedding in zip(chunks, embeddings):
        rows.append(
            {
                "resume_id": resume_id,
                "user_id": user_id,
                "chunk_index": chunk.index,
                "content": chunk.content,
                "content_char_count": len(chunk.content),
                "embedding": _vector_literal(embedding),
                "metadata": chunk.metadata,
            },
        )

    if rows:
        _request_json(
            "POST",
            "resume_chunks",
            body=rows,
            prefer="return=minimal",
        )


def list_user_resumes(user_id: str) -> list[ResumeDocumentSummary]:
    rows = _request_json(
        "GET",
        "resume_documents",
        query={
            "select": _document_select(),
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
        },
    )
    return [_summary_from_row(row) for row in rows]


def get_user_resume(user_id: str, resume_id: str) -> ResumeDocumentDetail:
    document_rows = _request_json(
        "GET",
        "resume_documents",
        query={
            "select": _document_select(),
            "id": f"eq.{resume_id}",
            "user_id": f"eq.{user_id}",
            "limit": "1",
        },
    )
    if not document_rows:
        raise ResumeNotFoundError("Resume document was not found.")

    chunk_rows = _request_json(
        "GET",
        "resume_chunks",
        query={
            "select": "id,chunk_index,content,content_char_count,metadata",
            "resume_id": f"eq.{resume_id}",
            "user_id": f"eq.{user_id}",
            "order": "chunk_index.asc",
            "limit": "5",
        },
    )
    chunks_preview = [_chunk_preview_from_row(row) for row in chunk_rows]
    preview_text = "\n\n".join(chunk.content for chunk in chunks_preview).strip()
    summary = _summary_from_row(document_rows[0])

    return ResumeDocumentDetail(
        **summary.model_dump(by_alias=True),
        previewText=preview_text[:600] if preview_text else None,
        chunksPreview=chunks_preview,
    )


def delete_user_resume(user_id: str, resume_id: str) -> None:
    rows = _request_json(
        "GET",
        "resume_documents",
        query={
            "select": "id",
            "id": f"eq.{resume_id}",
            "user_id": f"eq.{user_id}",
            "limit": "1",
        },
    )
    if not rows:
        raise ResumeNotFoundError("Resume document was not found.")

    _request_json(
        "DELETE",
        "resume_documents",
        query={
            "id": f"eq.{resume_id}",
            "user_id": f"eq.{user_id}",
        },
        prefer="return=minimal",
    )


def _insert_one(table: str, body: dict[str, Any]) -> dict[str, Any]:
    rows = _request_json(
        "POST",
        table,
        query={"select": "*"},
        body=body,
        prefer="return=representation",
    )
    if not isinstance(rows, list) or not rows:
        raise ResumeStoreError("Supabase insert did not return a row.")
    return rows[0]


def _request_json(
    method: str,
    table: str,
    *,
    query: dict[str, str] | None = None,
    body: dict[str, Any] | list[dict[str, Any]] | None = None,
    prefer: str | None = None,
) -> Any:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise ResumeStoreUnavailable(
            "Resume RAG storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        )

    base_url = settings.supabase_url.rstrip("/")
    url = f"{base_url}/rest/v1/{table}"
    if query:
        url = f"{url}?{urlencode(query, safe='*,.()')}"

    encoded_body = None
    if body is not None:
        encoded_body = json.dumps(body).encode("utf-8")

    headers = {
        "Accept": "application/json",
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
    if prefer:
        headers["Prefer"] = prefer

    request = Request(url, data=encoded_body, headers=headers, method=method)
    try:
        with urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        code, message = _friendly_supabase_error(table, exc.code, detail)
        raise ResumeStoreError(
            message,
            code=code,
            status_code=exc.code,
            technical_detail=detail,
        ) from exc
    except URLError as exc:
        raise ResumeStoreError(f"Unable to reach Supabase resume store: {exc}") from exc

    if not raw:
        return []
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ResumeStoreError("Supabase resume store returned invalid JSON.") from exc


def _document_select() -> str:
    return ",".join(
        [
            "id",
            "filename",
            "file_type",
            "file_size_bytes",
            "text_char_count",
            "chunk_count",
            "embedding_model",
            "status",
            "created_at",
        ],
    )


def _summary_from_row(row: dict[str, Any]) -> ResumeDocumentSummary:
    return ResumeDocumentSummary(
        id=str(row["id"]),
        filename=str(row.get("filename") or "resume"),
        fileType=str(row.get("file_type") or "unknown"),
        fileSizeBytes=row.get("file_size_bytes"),
        textCharCount=row.get("text_char_count") or 0,
        chunkCount=row.get("chunk_count") or 0,
        embeddingModel=str(row.get("embedding_model") or get_settings().resume_embedding_model),
        status=str(row.get("status") or "processed"),
        createdAt=str(row.get("created_at") or ""),
    )


def _chunk_preview_from_row(row: dict[str, Any]) -> ResumeChunkPreview:
    return ResumeChunkPreview(
        id=str(row["id"]),
        chunkIndex=row.get("chunk_index") or 0,
        content=_safe_resume_snippet(row.get("content"), max_chars=180),
        contentCharCount=row.get("content_char_count") or 0,
        metadata=row.get("metadata") or {},
    )


def _vector_literal(embedding: list[float]) -> str:
    return "[" + ",".join(f"{float(value):.8f}" for value in embedding) + "]"


def _safe_resume_snippet(value: Any, *, max_chars: int) -> str:
    text = " ".join(str(value or "").split())
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "..."


def _friendly_supabase_error(
    table: str,
    status_code: int,
    detail: str,
) -> tuple[str, str]:
    lowered = detail.lower()
    if status_code in {401, 403}:
        return (
            "resume_store_forbidden",
            "Resume storage rejected the backend credentials. Check SUPABASE_SERVICE_ROLE_KEY on the backend and restart the server.",
        )
    if "pgrst204" in lowered or "schema cache" in lowered or "42703" in lowered:
        return (
            "resume_store_schema_stale",
            "Resume storage schema is not up to date. Apply the latest Resume RAG migrations, refresh the Supabase schema cache, and restart the backend.",
        )
    if "match_resume_chunks" in lowered or "pgrst202" in lowered:
        return (
            "resume_retrieval_rpc_missing",
            "The match_resume_chunks RPC is missing. Apply the Resume RAG question-generation migration; Python fallback retrieval will be used when possible.",
        )
    if "resume_generated_questions" in lowered:
        return (
            "resume_question_history_missing",
            "Resume question history storage is not available. Apply migration 2026_task22_resume_question_history.sql and restart the backend if the schema cache is stale.",
        )
    if (
        "resume_documents" in lowered
        or "resume_chunks" in lowered
        or "relation" in lowered
        or "does not exist" in lowered
    ):
        return (
            "resume_rag_migration_missing",
            "Resume RAG tables are not available. Apply the Resume RAG migrations and confirm pgvector is enabled.",
        )
    if "vector" in lowered:
        return (
            "vector_store_unavailable",
            "Resume vector storage is not available. Confirm the pgvector extension and vector index migration are applied.",
        )
    return (
        "resume_store_error",
        f"Resume storage request failed with status {status_code}. Check backend configuration and Supabase migrations.",
    )

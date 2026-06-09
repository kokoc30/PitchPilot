import asyncio
import json
import math
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.models.sessions import (
    SaveSessionInput,
    SavedSessionDetail,
    SavedSessionSummary,
    SavedTranscript,
)
from app.utils.config import get_settings


class SessionPersistenceUnavailable(Exception):
    pass


class SessionPersistenceError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        technical_detail: str | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.technical_detail = technical_detail


class SessionNotFoundError(Exception):
    pass


async def save_practice_session(
    user_id: str,
    payload: SaveSessionInput,
) -> SavedSessionDetail:
    return await asyncio.to_thread(_save_practice_session_sync, user_id, payload)


async def list_practice_sessions(
    user_id: str,
    limit: int = 20,
) -> list[SavedSessionSummary]:
    return await asyncio.to_thread(_list_practice_sessions_sync, user_id, limit)


async def get_practice_session(
    user_id: str,
    session_id: str,
) -> SavedSessionDetail:
    return await asyncio.to_thread(_get_practice_session_sync, user_id, session_id)


async def delete_practice_session(user_id: str, session_id: str) -> None:
    await asyncio.to_thread(_delete_practice_session_sync, user_id, session_id)


def _save_practice_session_sync(
    user_id: str,
    payload: SaveSessionInput,
) -> SavedSessionDetail:
    metrics = _json_object(payload.metrics)
    score_snapshot = _json_object(payload.score_snapshot)
    coaching_report = _json_object(payload.coaching_report)
    retry_comparison = _json_object(payload.retry_comparison)

    # ── Deterministic scoring backup & client validation ──
    import logging
    logger = logging.getLogger("pitchpilot.persistence")

    word_count = len([w for w in payload.transcript.split() if w.strip()])
    client_status = score_snapshot.get("status", "insufficient_data")
    client_overall = _score_value(score_snapshot, "overall")

    client_score_invalid_or_missing = (
        not score_snapshot
        or client_status in ("warming_up", "insufficient_data")
        or client_overall is None
        or client_overall == 0
    )

    if word_count >= 3 and client_score_invalid_or_missing:
        logger.info(
            f"Client score snapshot for user {user_id} is missing, incomplete (status: {client_status}), or zero. "
            f"Recomputing score on backend using deterministic engine."
        )
        from app.services.deterministic_scoring import compute_score_snapshot
        score_snapshot = compute_score_snapshot(payload.transcript, metrics, is_final=True)
    elif score_snapshot and client_overall is not None and client_overall > 0:
        from app.services.deterministic_scoring import compute_score_snapshot
        backend_snapshot = compute_score_snapshot(payload.transcript, metrics, is_final=True)
        backend_overall = backend_snapshot.get("breakdown", {}).get("overall", 0)
        
        if abs(client_overall - backend_overall) > 15:
            logger.warning(
                f"Client overall score ({client_overall}) deviates significantly from backend "
                f"deterministic recomputed score ({backend_overall}) for user {user_id}. Deviation: {client_overall - backend_overall}"
            )
    final_segments = [
        segment.model_dump(by_alias=True, mode="json")
        for segment in payload.final_segments
    ]

    selected_prompt = payload.selected_prompt
    prompt_metadata = _selected_prompt_metadata(selected_prompt)
    resume_id = _safe_uuid_str(selected_prompt.resume_id if selected_prompt else None)

    base_row: dict[str, Any] = {
        "user_id": user_id,
        "mode": payload.mode,
        "title": payload.title,
        "duration_seconds": _safe_int(payload.duration_seconds),
        "overall_score": _score_value(score_snapshot, "overall"),
        "clarity_score": _score_value(score_snapshot, "clarity"),
        "pace_score": _score_value(score_snapshot, "pace"),
        "delivery_score": _score_value(score_snapshot, "delivery"),
        "engagement_score": _score_value(score_snapshot, "engagement"),
        "camera_facing_score": _first_non_none(
            _score_value(score_snapshot, "eyeContact"),
            _score_value(score_snapshot, "cameraFacing"),
        ),
        "filler_word_count": _safe_int(
            _first_present(metrics, "fillerWordCount", default=0),
        ),
        "words_per_minute": _safe_float(
            _first_present(
                metrics,
                "wordsPerMinute",
                default=_nested_get(score_snapshot, "metricsSummary", "wordsPerMinute"),
            ),
        ),
    }
    # Only include the Task 21 prompt columns when there is actually a
    # selected prompt to persist. This prevents a hard regression of the
    # existing Save Session feature when the Task 21 migration has not
    # been applied yet — PostgREST returns PGRST204 ("column does not
    # exist") on any reference to a missing column, even when the value
    # is null.
    if selected_prompt is not None:
        base_row.update(
            {
                "selected_prompt_text": selected_prompt.text,
                "selected_prompt_source": selected_prompt.source,
                "selected_prompt_metadata": prompt_metadata,
                "resume_id": resume_id,
                "question_id": selected_prompt.question_id,
            },
        )

    session_row = _insert_one("practice_sessions", base_row)

    session_id = str(session_row["id"])

    _insert_one(
        "session_transcripts",
        {
            "session_id": session_id,
            "full_transcript": payload.transcript,
            "final_segments": final_segments,
            "word_count": _safe_int(
                _first_present(
                    metrics,
                    "wordCount",
                    default=_count_words(payload.transcript),
                ),
            ),
        },
        return_representation=False,
    )

    _insert_one(
        "session_metrics",
        {
            "session_id": session_id,
            "metrics": metrics,
            "score_snapshot": score_snapshot,
        },
        return_representation=False,
    )

    if coaching_report:
        _insert_one(
            "session_reports",
            {
                "session_id": session_id,
                "provider": coaching_report.get("provider"),
                "report": coaching_report,
            },
            return_representation=False,
        )

    if retry_comparison:
        _insert_one(
            "retry_comparisons",
            {
                "user_id": user_id,
                "baseline_session_id": None,
                "retry_session_id": session_id,
                "comparison": retry_comparison,
            },
            return_representation=False,
        )

    return _get_practice_session_sync(user_id, session_id)


def _list_practice_sessions_sync(
    user_id: str,
    limit: int = 20,
) -> list[SavedSessionSummary]:
    safe_limit = max(1, min(int(limit or 20), 100))
    rows = _select_practice_sessions(
        {
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
            "limit": str(safe_limit),
        },
    )
    return [_summary_from_row(row) for row in rows]


def _get_practice_session_sync(
    user_id: str,
    session_id: str,
) -> SavedSessionDetail:
    session_rows = _select_practice_sessions(
        {
            "id": f"eq.{session_id}",
            "user_id": f"eq.{user_id}",
            "limit": "1",
        },
    )
    if not session_rows:
        raise SessionNotFoundError("Saved session was not found.")

    summary = _summary_from_row(session_rows[0])
    transcript_rows = _request_json(
        "GET",
        "session_transcripts",
        query={
            "select": "full_transcript,final_segments,word_count",
            "session_id": f"eq.{session_id}",
            "limit": "1",
        },
    )
    metric_rows = _request_json(
        "GET",
        "session_metrics",
        query={
            "select": "metrics,score_snapshot",
            "session_id": f"eq.{session_id}",
            "limit": "1",
        },
    )
    report_rows = _request_json(
        "GET",
        "session_reports",
        query={
            "select": "report",
            "session_id": f"eq.{session_id}",
            "order": "created_at.desc",
            "limit": "1",
        },
    )
    retry_rows = _request_json(
        "GET",
        "retry_comparisons",
        query={
            "select": "comparison",
            "retry_session_id": f"eq.{session_id}",
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
            "limit": "1",
        },
    )

    transcript_row = transcript_rows[0] if transcript_rows else {}
    metric_row = metric_rows[0] if metric_rows else {}
    raw_session_row = session_rows[0]
    return SavedSessionDetail(
        **summary.model_dump(by_alias=True),
        transcript=SavedTranscript(
            fullTranscript=transcript_row.get("full_transcript") or "",
            finalSegments=transcript_row.get("final_segments") or [],
            wordCount=transcript_row.get("word_count") or 0,
        ),
        metrics=metric_row.get("metrics") or {},
        scoreSnapshot=metric_row.get("score_snapshot") or {},
        coachingReport=report_rows[0].get("report") if report_rows else None,
        retryComparison=retry_rows[0].get("comparison") if retry_rows else None,
        selectedPromptMetadata=raw_session_row.get("selected_prompt_metadata"),
    )


def _delete_practice_session_sync(user_id: str, session_id: str) -> None:
    rows = _request_json(
        "GET",
        "practice_sessions",
        query={
            "select": "id",
            "id": f"eq.{session_id}",
            "user_id": f"eq.{user_id}",
            "limit": "1",
        },
    )
    if not rows:
        raise SessionNotFoundError("Saved session was not found.")

    _request_json(
        "DELETE",
        "practice_sessions",
        query={
            "id": f"eq.{session_id}",
            "user_id": f"eq.{user_id}",
        },
        prefer="return=minimal",
    )


def _insert_one(
    table: str,
    body: dict[str, Any],
    *,
    return_representation: bool = True,
) -> dict[str, Any]:
    query = {"select": "*"} if return_representation else None
    rows = _request_json(
        "POST",
        table,
        query=query,
        body=body,
        prefer="return=representation" if return_representation else "return=minimal",
    )
    if not return_representation:
        return {}
    if not isinstance(rows, list) or not rows:
        raise SessionPersistenceError("Supabase insert did not return a row.")
    return rows[0]


def _request_json(
    method: str,
    table: str,
    *,
    query: dict[str, str] | None = None,
    body: dict[str, Any] | None = None,
    prefer: str | None = None,
) -> Any:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SessionPersistenceUnavailable(
            "Session persistence requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
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
        with urlopen(request, timeout=15) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        message = _friendly_session_error(exc.code, detail)
        raise SessionPersistenceError(
            message,
            status_code=exc.code,
            technical_detail=detail,
        ) from exc
    except URLError as exc:
        raise SessionPersistenceError(f"Unable to reach Supabase: {exc}") from exc

    if not raw:
        return []
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SessionPersistenceError("Supabase returned invalid JSON.") from exc


def _friendly_session_error(status_code: int, detail: str) -> str:
    lowered = detail.lower()
    if status_code in {401, 403}:
        return (
            "Session persistence rejected the backend credentials. Check "
            "SUPABASE_SERVICE_ROLE_KEY on the backend and restart the server."
        )
    if "pgrst204" in lowered or "schema cache" in lowered or "42703" in lowered:
        return (
            "Session storage schema is not up to date. Apply the latest session "
            "migrations, refresh the Supabase schema cache, and restart the backend."
        )
    if "practice_sessions" in lowered or "relation" in lowered or "does not exist" in lowered:
        return (
            "Session storage tables are not available. Apply the session persistence "
            "migration before saving or loading sessions."
        )
    return (
        f"Session persistence request failed with status {status_code}. "
        "Check backend configuration and Supabase migrations."
    )


_LEGACY_SUMMARY_COLUMNS = (
    "id",
    "mode",
    "title",
    "duration_seconds",
    "overall_score",
    "clarity_score",
    "pace_score",
    "delivery_score",
    "engagement_score",
    "camera_facing_score",
    "filler_word_count",
    "words_per_minute",
    "created_at",
    "updated_at",
)

_TASK21_SUMMARY_COLUMNS = (
    "selected_prompt_text",
    "selected_prompt_source",
    "selected_prompt_metadata",
    "resume_id",
    "question_id",
)


def _summary_select() -> str:
    return ",".join((*_LEGACY_SUMMARY_COLUMNS, *_TASK21_SUMMARY_COLUMNS))


def _select_practice_sessions(filters: dict[str, str]) -> list[dict[str, Any]]:
    """Select practice_sessions rows with a graceful fallback when the
    Task 21 prompt columns are missing on the database.

    PostgREST returns 400 / 42703 / PGRST204 when the schema cache does
    not know about a referenced column. We retry once with only the
    legacy column set so existing saved sessions are still browsable on
    a pre-migration database.
    """
    extended_query = {"select": _summary_select(), **filters}
    try:
        rows = _request_json("GET", "practice_sessions", query=extended_query)
        return rows if isinstance(rows, list) else []
    except SessionPersistenceError as exc:
        message = (exc.technical_detail or str(exc)).lower()
        missing_column = (
            "pgrst204" in message
            or "42703" in message
            or "selected_prompt" in message
            or "question_id" in message
            or "resume_id" in message
        )
        if not missing_column:
            raise
    legacy_query = {
        "select": ",".join(_LEGACY_SUMMARY_COLUMNS),
        **filters,
    }
    rows = _request_json("GET", "practice_sessions", query=legacy_query)
    return rows if isinstance(rows, list) else []


def _summary_from_row(row: dict[str, Any]) -> SavedSessionSummary:
    return SavedSessionSummary(
        id=str(row["id"]),
        mode=row.get("mode") or "custom",
        title=row.get("title"),
        durationSeconds=row.get("duration_seconds") or 0,
        overallScore=row.get("overall_score"),
        clarityScore=row.get("clarity_score"),
        paceScore=row.get("pace_score"),
        deliveryScore=row.get("delivery_score"),
        engagementScore=row.get("engagement_score"),
        cameraFacingScore=row.get("camera_facing_score"),
        fillerWordCount=row.get("filler_word_count") or 0,
        wordsPerMinute=_safe_float(row.get("words_per_minute")),
        createdAt=str(row.get("created_at") or ""),
        updatedAt=str(row.get("updated_at") or ""),
        selectedPromptText=row.get("selected_prompt_text"),
        selectedPromptSource=row.get("selected_prompt_source"),
        resumeId=_safe_str(row.get("resume_id")),
        questionId=_safe_str(row.get("question_id")),
    )


def _selected_prompt_metadata(prompt) -> dict[str, Any] | None:
    """Return a small JSON-safe dict for selected_prompt_metadata.

    Only short, user-supplied metadata is persisted; raw resume text is
    never written here.
    """
    if prompt is None:
        return None
    metadata = {
        "category": _safe_text(prompt.category, max_chars=80),
        "difficulty": _safe_text(prompt.difficulty, max_chars=80),
        "questionSource": _safe_text(prompt.question_source, max_chars=40),
        "resumeLabel": _safe_text(prompt.resume_label, max_chars=120),
        "groundedIn": _short_strings(prompt.grounded_in, max_items=3, max_chars=220),
        "resumeChunkIds": _short_strings(prompt.resume_chunk_ids, max_items=8, max_chars=80),
        "suggestedAnswerAngle": _safe_text(
            prompt.suggested_answer_angle,
            max_chars=500,
        ),
    }
    return {key: value for key, value in metadata.items() if value not in (None, [], "")} or None


def _short_strings(
    value: list[str] | None,
    *,
    max_items: int,
    max_chars: int,
) -> list[str]:
    if not isinstance(value, list):
        return []
    cleaned = [str(item).strip() for item in value if str(item).strip()]
    return [item[:max_chars] for item in cleaned[:max_items]]


def _safe_text(value: Any, *, max_chars: int) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text[:max_chars]


def _safe_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _safe_uuid_str(value: Any) -> str | None:
    """Best-effort UUID coercion. Returns None for invalid values so a
    tampered/empty resume id doesn't crash the insert."""
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    import uuid as _uuid

    try:
        return str(_uuid.UUID(text))
    except (ValueError, TypeError):
        return None


def _json_object(value: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    return json.loads(json.dumps(value))


def _score_value(score_snapshot: dict[str, Any], key: str) -> int | None:
    breakdown = score_snapshot.get("breakdown")
    if not isinstance(breakdown, dict):
        return None
    return _safe_int_or_none(breakdown.get(key))


def _nested_get(value: dict[str, Any], *path: str) -> Any:
    current: Any = value
    for item in path:
        if not isinstance(current, dict):
            return None
        current = current.get(item)
    return current


def _first_present(value: dict[str, Any], key: str, *, default: Any = None) -> Any:
    return value[key] if key in value and value[key] is not None else default


def _first_non_none(*values: Any) -> Any:
    for value in values:
        if value is not None:
            return value
    return None


def _safe_int(value: Any) -> int:
    safe = _safe_int_or_none(value)
    return safe if safe is not None else 0


def _safe_int_or_none(value: Any) -> int | None:
    if value is None:
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(parsed):
        return None
    return int(round(parsed))


def _safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(parsed):
        return None
    return parsed


def _count_words(text: str) -> int:
    return len([word for word in text.split() if word.strip()])

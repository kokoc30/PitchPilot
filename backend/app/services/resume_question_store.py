import re
from datetime import datetime, timezone
from typing import Any

from app.models.resume_questions import ResumeQuestion
from app.services.resume_rag_store import (
    ResumeStoreError,
    ResumeStoreUnavailable,
    _request_json,  # type: ignore[attr-defined]
)

MAX_STORED_GROUNDING_ITEMS = 3
MAX_STORED_GROUNDING_CHARS = 220
MAX_STORED_ANGLE_CHARS = 500
MAX_STORED_LABEL_CHARS = 160


class ResumeQuestionNotFoundError(Exception):
    pass


class ResumeQuestionStoreError(Exception):
    def __init__(
        self,
        message: str,
        *,
        code: str = "resume_question_store_error",
        status_code: int | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def list_resume_questions(
    *,
    user_id: str,
    resume_id: str,
    resume_label: str | None = None,
) -> list[ResumeQuestion]:
    rows = _safe_request(
        "GET",
        "resume_generated_questions",
        query={
            "select": _question_select(),
            "user_id": f"eq.{user_id}",
            "resume_id": f"eq.{resume_id}",
            "order": "created_at.desc",
            "limit": "500",
        },
    )
    if not isinstance(rows, list):
        return []
    return [_question_from_row(row, resume_label=resume_label) for row in rows]


def save_generated_resume_questions(
    *,
    user_id: str,
    resume_id: str,
    questions: list[ResumeQuestion],
    target_role: str | None = None,
    focus: str | None = None,
    resume_label: str | None = None,
) -> list[ResumeQuestion]:
    existing = _existing_questions_by_normalized(user_id=user_id, resume_id=resume_id)
    saved: list[ResumeQuestion] = []
    seen: set[str] = set()

    for question in questions:
        normalized = normalize_question_text(question.question)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)

        row = existing.get(normalized)
        if row:
            row = _update_existing_question(
                user_id=user_id,
                resume_id=resume_id,
                question_id=str(row["id"]),
                question=question,
                target_role=target_role,
                focus=focus,
            )
        else:
            row = _insert_question(
                user_id=user_id,
                resume_id=resume_id,
                normalized=normalized,
                question=question,
                target_role=target_role,
                focus=focus,
            )
        saved.append(_question_from_row(row, resume_label=resume_label))

    return saved


def patch_resume_question(
    *,
    user_id: str,
    resume_id: str,
    question_id: str,
    is_favorite: bool | None = None,
    mark_practiced: bool = False,
    resume_label: str | None = None,
) -> ResumeQuestion:
    current = _get_question_row(
        user_id=user_id,
        resume_id=resume_id,
        question_id=question_id,
    )
    body: dict[str, Any] = {}
    if is_favorite is not None:
        body["is_favorite"] = bool(is_favorite)
    if mark_practiced:
        body["practiced_count"] = int(current.get("practiced_count") or 0) + 1
        body["last_practiced_at"] = datetime.now(timezone.utc).isoformat()

    if not body:
        return _question_from_row(current, resume_label=resume_label)

    rows = _safe_request(
        "PATCH",
        "resume_generated_questions",
        query={
            "select": _question_select(),
            "id": f"eq.{question_id}",
            "user_id": f"eq.{user_id}",
            "resume_id": f"eq.{resume_id}",
        },
        body=body,
        prefer="return=representation",
    )
    if not isinstance(rows, list) or not rows:
        raise ResumeQuestionNotFoundError("Resume question was not found.")
    return _question_from_row(rows[0], resume_label=resume_label)


def delete_resume_question(
    *,
    user_id: str,
    resume_id: str,
    question_id: str,
) -> None:
    _get_question_row(user_id=user_id, resume_id=resume_id, question_id=question_id)
    _safe_request(
        "DELETE",
        "resume_generated_questions",
        query={
            "id": f"eq.{question_id}",
            "user_id": f"eq.{user_id}",
            "resume_id": f"eq.{resume_id}",
        },
        prefer="return=minimal",
    )


def normalize_question_text(question: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", " ", question.lower()).strip()
    return re.sub(r"\s+", " ", cleaned)


def _existing_questions_by_normalized(
    *,
    user_id: str,
    resume_id: str,
) -> dict[str, dict[str, Any]]:
    rows = _safe_request(
        "GET",
        "resume_generated_questions",
        query={
            "select": _question_select(),
            "user_id": f"eq.{user_id}",
            "resume_id": f"eq.{resume_id}",
            "limit": "500",
        },
    )
    if not isinstance(rows, list):
        return {}
    existing: dict[str, dict[str, Any]] = {}
    for row in rows:
        normalized = str(row.get("question_normalized") or "").strip()
        if normalized:
            existing[normalized] = row
    return existing


def _get_question_row(
    *,
    user_id: str,
    resume_id: str,
    question_id: str,
) -> dict[str, Any]:
    rows = _safe_request(
        "GET",
        "resume_generated_questions",
        query={
            "select": _question_select(),
            "id": f"eq.{question_id}",
            "user_id": f"eq.{user_id}",
            "resume_id": f"eq.{resume_id}",
            "limit": "1",
        },
    )
    if not isinstance(rows, list) or not rows:
        raise ResumeQuestionNotFoundError("Resume question was not found.")
    return rows[0]


def _insert_question(
    *,
    user_id: str,
    resume_id: str,
    normalized: str,
    question: ResumeQuestion,
    target_role: str | None,
    focus: str | None,
) -> dict[str, Any]:
    rows = _safe_request(
        "POST",
        "resume_generated_questions",
        query={"select": _question_select()},
        body=_row_body(
            user_id=user_id,
            resume_id=resume_id,
            normalized=normalized,
            question=question,
            target_role=target_role,
            focus=focus,
        ),
        prefer="return=representation",
    )
    if not isinstance(rows, list) or not rows:
        raise ResumeQuestionStoreError("Supabase insert did not return a question row.")
    return rows[0]


def _update_existing_question(
    *,
    user_id: str,
    resume_id: str,
    question_id: str,
    question: ResumeQuestion,
    target_role: str | None,
    focus: str | None,
) -> dict[str, Any]:
    rows = _safe_request(
        "PATCH",
        "resume_generated_questions",
        query={
            "select": _question_select(),
            "id": f"eq.{question_id}",
            "user_id": f"eq.{user_id}",
            "resume_id": f"eq.{resume_id}",
        },
        body=_metadata_body(question=question, target_role=target_role, focus=focus),
        prefer="return=representation",
    )
    if not isinstance(rows, list) or not rows:
        raise ResumeQuestionNotFoundError("Resume question was not found.")
    return rows[0]


def _row_body(
    *,
    user_id: str,
    resume_id: str,
    normalized: str,
    question: ResumeQuestion,
    target_role: str | None,
    focus: str | None,
) -> dict[str, Any]:
    body = _metadata_body(question=question, target_role=target_role, focus=focus)
    body.update(
        {
            "user_id": user_id,
            "resume_id": resume_id,
            "question": question.question,
            "question_normalized": normalized,
        },
    )
    return body


def _metadata_body(
    *,
    question: ResumeQuestion,
    target_role: str | None,
    focus: str | None,
) -> dict[str, Any]:
    return {
        "category": _safe_text(question.category, max_chars=80),
        "difficulty": question.difficulty,
        "source": question.source,
        "grounded_in": _short_grounding(question.grounded_in),
        "resume_chunk_ids": _short_strings(question.resume_chunk_ids, max_items=8),
        "suggested_answer_angle": _safe_text(
            question.suggested_answer_angle,
            max_chars=MAX_STORED_ANGLE_CHARS,
        ),
        "target_role": _safe_text(target_role, max_chars=MAX_STORED_LABEL_CHARS),
        "focus": _safe_text(focus, max_chars=MAX_STORED_LABEL_CHARS),
    }


def _question_from_row(
    row: dict[str, Any],
    *,
    resume_label: str | None,
) -> ResumeQuestion:
    return ResumeQuestion(
        id=str(row["id"]),
        question=str(row.get("question") or ""),
        category=str(row.get("category") or "General"),
        difficulty=_difficulty(row.get("difficulty")),
        source=_source(row.get("source")),
        groundedIn=_short_grounding(row.get("grounded_in")),
        suggestedAnswerAngle=_safe_text(
            row.get("suggested_answer_angle"),
            max_chars=MAX_STORED_ANGLE_CHARS,
        ),
        resumeChunkIds=_short_strings(row.get("resume_chunk_ids"), max_items=8),
        isPersisted=True,
        isFavorite=bool(row.get("is_favorite")),
        practicedCount=int(row.get("practiced_count") or 0),
        lastPracticedAt=_safe_text(row.get("last_practiced_at"), max_chars=64),
        createdAt=_safe_text(row.get("created_at"), max_chars=64),
        targetRole=_safe_text(row.get("target_role"), max_chars=MAX_STORED_LABEL_CHARS),
        focus=_safe_text(row.get("focus"), max_chars=MAX_STORED_LABEL_CHARS),
        resumeLabel=resume_label,
    )


def _safe_request(method: str, table: str, **kwargs: Any) -> Any:
    try:
        return _request_json(method, table, **kwargs)
    except ResumeStoreUnavailable:
        raise
    except ResumeStoreError as exc:
        raise ResumeQuestionStoreError(
            exc.message,
            code=exc.code,
            status_code=exc.status_code,
        ) from exc


def _question_select() -> str:
    return ",".join(
        [
            "id",
            "resume_id",
            "question",
            "question_normalized",
            "category",
            "difficulty",
            "source",
            "grounded_in",
            "resume_chunk_ids",
            "suggested_answer_angle",
            "target_role",
            "focus",
            "practiced_count",
            "last_practiced_at",
            "is_favorite",
            "created_at",
        ],
    )


def _difficulty(value: Any) -> str:
    text = str(value or "").strip().lower()
    if text in {"easy", "medium", "hard"}:
        return text
    return "medium"


def _source(value: Any) -> str:
    text = str(value or "").strip().lower()
    if text in {"resume", "general", "mock"}:
        return text
    return "general"


def _short_grounding(value: Any) -> list[str]:
    return [
        item[:MAX_STORED_GROUNDING_CHARS]
        for item in _short_strings(value, max_items=MAX_STORED_GROUNDING_ITEMS)
    ]


def _short_strings(value: Any, *, max_items: int) -> list[str]:
    if not isinstance(value, list):
        return []
    cleaned = [str(item).strip() for item in value if str(item).strip()]
    return cleaned[:max_items]


def _safe_text(value: Any, *, max_chars: int | None = None) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text[:max_chars] if max_chars is not None else text

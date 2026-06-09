from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

ResumeInterviewType = Literal[
    "behavioral",
    "technical",
    "project",
    "startup",
    "general",
]
ResumeQuestionDifficulty = Literal["easy", "medium", "hard"]
ResumeQuestionSource = Literal["resume", "general", "mock"]
ResumeQuestionProvider = Literal["openai", "gemini", "mock"]

MAX_QUESTION_TEXT_CHARS = 1000
MAX_CATEGORY_CHARS = 80
MAX_GROUNDING_ITEMS = 3
MAX_GROUNDING_CHARS = 220
MAX_SUGGESTED_ANGLE_CHARS = 500
MAX_RESUME_LABEL_CHARS = 120
MAX_TARGET_ROLE_CHARS = 160
MAX_FOCUS_CHARS = 160


class ResumeQuestionGenerateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    target_role: str | None = Field(default=None, alias="targetRole")
    interview_type: ResumeInterviewType = Field(
        default="general",
        alias="interviewType",
    )
    difficulty: ResumeQuestionDifficulty = "medium"
    count: int = 8
    focus: str | None = None
    save: bool = True

    @field_validator("target_role", "focus")
    @classmethod
    def trim_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None

    @field_validator("count")
    @classmethod
    def clamp_count(cls, value: int) -> int:
        if value < 1:
            return 1
        if value > 12:
            return 12
        return value


class ResumeRetrievedChunk(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    resume_id: str = Field(alias="resumeId")
    chunk_index: int = Field(alias="chunkIndex")
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    similarity: float | None = None
    distance: float | None = None


class ResumeRetrievalPreviewItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    chunk_index: int = Field(alias="chunkIndex")
    content_preview: str = Field(alias="contentPreview")
    similarity: float | None = None
    distance: float | None = None


class ResumeRetrievalPreviewResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    resume_id: str = Field(alias="resumeId")
    query: str
    method: Literal["rpc", "python_fallback"]
    chunks: list[ResumeRetrievalPreviewItem]


class ResumeQuestion(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    question: str
    category: str
    difficulty: ResumeQuestionDifficulty
    source: ResumeQuestionSource
    grounded_in: list[str] = Field(default_factory=list, alias="groundedIn")
    suggested_answer_angle: str | None = Field(
        default=None,
        alias="suggestedAnswerAngle",
    )
    resume_chunk_ids: list[str] = Field(default_factory=list, alias="resumeChunkIds")
    is_persisted: bool = Field(default=False, alias="isPersisted")
    is_favorite: bool = Field(default=False, alias="isFavorite")
    practiced_count: int = Field(default=0, alias="practicedCount")
    last_practiced_at: str | None = Field(default=None, alias="lastPracticedAt")
    created_at: str | None = Field(default=None, alias="createdAt")
    target_role: str | None = Field(default=None, alias="targetRole")
    focus: str | None = None
    resume_label: str | None = Field(default=None, alias="resumeLabel")

    @field_validator("question")
    @classmethod
    def trim_question(cls, value: str) -> str:
        return value.strip()[:MAX_QUESTION_TEXT_CHARS]

    @field_validator("category")
    @classmethod
    def trim_category(cls, value: str) -> str:
        trimmed = value.strip()[:MAX_CATEGORY_CHARS]
        return trimmed or "General"

    @field_validator("suggested_answer_angle")
    @classmethod
    def trim_suggested_angle(cls, value: str | None) -> str | None:
        return _trim_optional(value, MAX_SUGGESTED_ANGLE_CHARS)

    @field_validator("resume_label")
    @classmethod
    def trim_resume_label(cls, value: str | None) -> str | None:
        return _trim_optional(value, MAX_RESUME_LABEL_CHARS)

    @field_validator("target_role")
    @classmethod
    def trim_target_role(cls, value: str | None) -> str | None:
        return _trim_optional(value, MAX_TARGET_ROLE_CHARS)

    @field_validator("focus")
    @classmethod
    def trim_focus(cls, value: str | None) -> str | None:
        return _trim_optional(value, MAX_FOCUS_CHARS)

    @field_validator("grounded_in")
    @classmethod
    def compact_grounded_references(cls, value: list[str]) -> list[str]:
        cleaned = [item.strip() for item in value if item and item.strip()]
        return [item[:MAX_GROUNDING_CHARS] for item in cleaned[:MAX_GROUNDING_ITEMS]]

    @field_validator("resume_chunk_ids")
    @classmethod
    def compact_resume_chunk_ids(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item and item.strip()][:8]


def _trim_optional(value: str | None, max_chars: int) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    return trimmed[:max_chars]


class ResumeQuestionGenerateResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    resume_id: str = Field(alias="resumeId")
    provider: ResumeQuestionProvider
    model: str
    questions: list[ResumeQuestion]
    retrieved_chunk_count: int = Field(alias="retrievedChunkCount")
    retrieval_method: Literal["rpc", "python_fallback"] = Field(
        alias="retrievalMethod",
    )
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        alias="generatedAt",
    )
    warnings: list[str] = Field(default_factory=list)


def resume_question_content_json_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "questions": {
                "type": "array",
                "minItems": 1,
                "maxItems": 12,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "question": {"type": "string"},
                        "category": {"type": "string"},
                        "difficulty": {
                            "type": "string",
                            "enum": ["easy", "medium", "hard"],
                        },
                        "source": {
                            "type": "string",
                            "enum": ["resume", "general"],
                        },
                        "groundedIn": {
                            "type": "array",
                            "items": {"type": "string"},
                            "maxItems": MAX_GROUNDING_ITEMS,
                        },
                        "suggestedAnswerAngle": {"type": ["string", "null"]},
                        "resumeChunkIds": {
                            "type": "array",
                            "items": {"type": "string"},
                            "maxItems": 8,
                        },
                    },
                    "required": [
                        "question",
                        "category",
                        "difficulty",
                        "source",
                        "groundedIn",
                        "suggestedAnswerAngle",
                        "resumeChunkIds",
                    ],
                },
            },
        },
        "required": ["questions"],
    }

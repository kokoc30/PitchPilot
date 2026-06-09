from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.coaching import PracticePromptContext

MAX_TRANSCRIPT_CHARS = 50_000
MAX_TITLE_CHARS = 120


class SessionTranscriptSegment(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    text: str = ""
    confidence: float | None = None
    start_ms: float | None = Field(default=None, alias="startMs")
    end_ms: float | None = Field(default=None, alias="endMs")

    @field_validator("text")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()


class SaveSessionInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    mode: str
    title: str | None = Field(default=None, max_length=MAX_TITLE_CHARS)
    duration_seconds: float | int = Field(default=0, alias="durationSeconds")
    transcript: str = ""
    final_segments: list[SessionTranscriptSegment] = Field(
        default_factory=list,
        alias="finalSegments",
    )
    metrics: dict[str, Any] = Field(default_factory=dict)
    score_snapshot: dict[str, Any] = Field(default_factory=dict, alias="scoreSnapshot")
    coaching_report: dict[str, Any] | None = Field(
        default=None,
        alias="coachingReport",
    )
    retry_comparison: dict[str, Any] | None = Field(
        default=None,
        alias="retryComparison",
    )
    selected_prompt: PracticePromptContext | None = Field(
        default=None,
        alias="selectedPrompt",
    )

    @field_validator("mode")
    @classmethod
    def trim_mode(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("mode is required")
        return trimmed

    @field_validator("title")
    @classmethod
    def trim_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None

    @field_validator("transcript")
    @classmethod
    def trim_and_limit_transcript(cls, value: str) -> str:
        trimmed = value.strip()
        return trimmed[:MAX_TRANSCRIPT_CHARS]


class SavedSessionSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    mode: str
    title: str | None = None
    duration_seconds: int = Field(alias="durationSeconds")
    overall_score: int | None = Field(default=None, alias="overallScore")
    clarity_score: int | None = Field(default=None, alias="clarityScore")
    pace_score: int | None = Field(default=None, alias="paceScore")
    delivery_score: int | None = Field(default=None, alias="deliveryScore")
    engagement_score: int | None = Field(default=None, alias="engagementScore")
    camera_facing_score: int | None = Field(default=None, alias="cameraFacingScore")
    filler_word_count: int = Field(default=0, alias="fillerWordCount")
    words_per_minute: float | None = Field(default=None, alias="wordsPerMinute")
    created_at: str = Field(alias="createdAt")
    updated_at: str | None = Field(default=None, alias="updatedAt")
    selected_prompt_text: str | None = Field(
        default=None,
        alias="selectedPromptText",
    )
    selected_prompt_source: str | None = Field(
        default=None,
        alias="selectedPromptSource",
    )
    resume_id: str | None = Field(default=None, alias="resumeId")
    question_id: str | None = Field(default=None, alias="questionId")


class SavedTranscript(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    full_transcript: str = Field(default="", alias="fullTranscript")
    final_segments: list[dict[str, Any]] = Field(default_factory=list, alias="finalSegments")
    word_count: int = Field(default=0, alias="wordCount")


class SavedSessionDetail(SavedSessionSummary):
    transcript: SavedTranscript
    metrics: dict[str, Any] = Field(default_factory=dict)
    score_snapshot: dict[str, Any] = Field(default_factory=dict, alias="scoreSnapshot")
    coaching_report: dict[str, Any] | None = Field(default=None, alias="coachingReport")
    retry_comparison: dict[str, Any] | None = Field(default=None, alias="retryComparison")
    selected_prompt_metadata: dict[str, Any] | None = Field(
        default=None,
        alias="selectedPromptMetadata",
    )


class SavedSessionsListResponse(BaseModel):
    sessions: list[SavedSessionSummary]


class DeleteSessionResponse(BaseModel):
    deleted: bool
    id: str

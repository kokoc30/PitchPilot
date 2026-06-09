from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

CoachingMode = Literal[
    "interview",
    "startup_pitch",
    "presentation",
    "elevator_pitch",
    "custom",
]

LLMProviderName = Literal["openai", "gemini", "mock"]
LLMProviderConfig = Literal["auto", "openai", "gemini", "mock"]
ConfidenceLabel = Literal["low", "medium", "high"]
GeneratedFrom = Literal["current_session", "manual"]
HighlightType = Literal["strength", "improvement", "filler", "clarity", "delivery"]
PromptSource = Literal["resume_question", "manual"]
QuestionSource = Literal["resume", "general", "mock"]

MAX_PROMPT_TEXT_CHARS = 1000
MAX_PROMPT_LABEL_CHARS = 120
MAX_PROMPT_META_CHARS = 80
MAX_PROMPT_GROUNDING_ITEMS = 3
MAX_PROMPT_GROUNDING_CHARS = 220
MAX_PROMPT_ANGLE_CHARS = 500


class PracticePromptContext(BaseModel):
    """Selected interview question / prompt context carried into coaching.

    Only short, user-supplied strings (question text, grounded summaries
    already returned by the question generator) are stored here. We never
    re-fetch resume chunks from the database in coaching, so a tampered
    resumeId cannot leak another user's data.
    """

    model_config = ConfigDict(populate_by_name=True)

    text: str
    source: PromptSource = "manual"
    resume_id: str | None = Field(default=None, alias="resumeId")
    resume_label: str | None = Field(default=None, alias="resumeLabel")
    question_id: str | None = Field(default=None, alias="questionId")
    category: str | None = None
    difficulty: str | None = None
    question_source: QuestionSource | None = Field(
        default=None,
        alias="questionSource",
    )
    grounded_in: list[str] = Field(default_factory=list, alias="groundedIn")
    resume_chunk_ids: list[str] = Field(
        default_factory=list,
        alias="resumeChunkIds",
    )
    suggested_answer_angle: str | None = Field(
        default=None,
        alias="suggestedAnswerAngle",
    )

    @field_validator("text")
    @classmethod
    def _trim_text(cls, value: str) -> str:
        return value.strip()[:MAX_PROMPT_TEXT_CHARS]

    @field_validator("category", "difficulty")
    @classmethod
    def _trim_short_optional(cls, value: str | None) -> str | None:
        return _trim_optional_text(value, MAX_PROMPT_META_CHARS)

    @field_validator("resume_label")
    @classmethod
    def _trim_resume_label(cls, value: str | None) -> str | None:
        return _trim_optional_text(value, MAX_PROMPT_LABEL_CHARS)

    @field_validator("suggested_answer_angle")
    @classmethod
    def _trim_answer_angle(cls, value: str | None) -> str | None:
        return _trim_optional_text(value, MAX_PROMPT_ANGLE_CHARS)

    @field_validator("grounded_in")
    @classmethod
    def _compact_grounded(cls, value: list[str]) -> list[str]:
        compacted = [item.strip() for item in value if item and item.strip()]
        # Defensive cap: short summaries only, never raw chunks.
        return [
            item[:MAX_PROMPT_GROUNDING_CHARS]
            for item in compacted[:MAX_PROMPT_GROUNDING_ITEMS]
        ]

    @field_validator("resume_chunk_ids")
    @classmethod
    def _compact_chunk_ids(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item and item.strip()][:8]


def _trim_optional_text(value: str | None, max_chars: int) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    return trimmed[:max_chars]


class CoachingDraftInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    transcript: str
    mode: CoachingMode
    metrics: dict[str, Any] = Field(default_factory=dict)
    score_snapshot: dict[str, Any] = Field(default_factory=dict, alias="scoreSnapshot")
    user_goal: str | None = Field(default=None, alias="userGoal")
    prompt: str | None = None
    prompt_context: PracticePromptContext | None = Field(
        default=None,
        alias="promptContext",
    )
    duration_seconds: float | None = Field(default=None, alias="durationSeconds")

    @field_validator("transcript")
    @classmethod
    def trim_transcript(cls, value: str) -> str:
        return value.strip()

    @field_validator("user_goal", "prompt")
    @classmethod
    def trim_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None


class FinalTranscriptSegment(BaseModel):
    text: str
    confidence: float | None = None
    start_ms: float | None = Field(default=None, alias="startMs")
    end_ms: float | None = Field(default=None, alias="endMs")


class CoachingReportInput(CoachingDraftInput):
    final_transcript_segments: list[FinalTranscriptSegment] = Field(
        default_factory=list,
        alias="finalTranscriptSegments",
    )
    interim_text: str | None = Field(default=None, alias="interimText")
    generated_from: GeneratedFrom = Field(default="current_session", alias="generatedFrom")
    dev_force: bool = Field(default=False, alias="devForce")

    @field_validator("interim_text")
    @classmethod
    def trim_interim_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None


class CoachingDraftContent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    summary: str
    strengths: list[str] = Field(default_factory=list)
    improvement_areas: list[str] = Field(default_factory=list, alias="improvementAreas")
    next_practice_focus: list[str] = Field(default_factory=list, alias="nextPracticeFocus")
    confidence_label: ConfidenceLabel = Field(alias="confidenceLabel")
    safety_note: str | None = Field(default=None, alias="safetyNote")

    @field_validator("summary")
    @classmethod
    def trim_summary(cls, value: str) -> str:
        return value.strip()

    @field_validator("strengths", "improvement_areas", "next_practice_focus")
    @classmethod
    def compact_lists(cls, value: list[str]) -> list[str]:
        compacted = [item.strip() for item in value if item.strip()]
        return compacted[:3]

    @field_validator("safety_note")
    @classmethod
    def trim_safety_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None


class CoachingDraftOutput(CoachingDraftContent):
    provider: LLMProviderName
    model: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="generatedAt")


class TranscriptHighlight(BaseModel):
    quote: str
    note: str
    type: HighlightType

    @field_validator("quote", "note")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()


class ScoreSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    overall_score: int = Field(alias="overallScore")
    clarity: int
    pace: int
    delivery: int
    engagement: int
    camera_facing: int = Field(alias="cameraFacing")
    label: str


class CoachingReportContent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    summary: str
    overall_assessment: str = Field(alias="overallAssessment")
    strengths: list[str] = Field(default_factory=list)
    improvement_areas: list[str] = Field(default_factory=list, alias="improvementAreas")
    next_practice_focus: list[str] = Field(default_factory=list, alias="nextPracticeFocus")
    rewritten_answer: str = Field(alias="rewrittenAnswer")
    transcript_highlights: list[TranscriptHighlight] = Field(
        default_factory=list,
        alias="transcriptHighlights",
    )
    score_summary: ScoreSummary = Field(alias="scoreSummary")
    confidence_label: ConfidenceLabel = Field(alias="confidenceLabel")
    safety_note: str = Field(alias="safetyNote")

    @field_validator(
        "summary",
        "overall_assessment",
        "rewritten_answer",
        "safety_note",
    )
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("strengths", "improvement_areas", "next_practice_focus")
    @classmethod
    def compact_report_lists(cls, value: list[str]) -> list[str]:
        compacted = [item.strip() for item in value if item.strip()]
        return compacted[:4]

    @field_validator("transcript_highlights")
    @classmethod
    def compact_highlights(cls, value: list[TranscriptHighlight]) -> list[TranscriptHighlight]:
        return value[:5]


class CoachingReportOutput(CoachingReportContent):
    provider: LLMProviderName
    model: str
    report_id: str | None = Field(default=None, alias="reportId")
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="generatedAt")
    mode: CoachingMode


class CoachingStatusResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    provider_configured: LLMProviderConfig = Field(alias="providerConfigured")
    effective_provider: LLMProviderName | Literal["unavailable"] = Field(alias="effectiveProvider")
    openai_configured: bool = Field(alias="openaiConfigured")
    gemini_configured: bool = Field(alias="geminiConfigured")
    mock_available: bool = Field(default=True, alias="mockAvailable")
    fallback_enabled: bool = Field(alias="fallbackEnabled")
    timeout_seconds: float = Field(alias="timeoutSeconds")
    openai_model: str = Field(alias="openaiModel")
    gemini_model: str = Field(alias="geminiModel")
    report_supported: bool = Field(default=True, alias="reportSupported")


class CoachingErrorDetail(BaseModel):
    code: str
    message: str


def coaching_draft_content_json_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "summary": {"type": "string"},
            "strengths": {
                "type": "array",
                "items": {"type": "string"},
                "maxItems": 3,
            },
            "improvementAreas": {
                "type": "array",
                "items": {"type": "string"},
                "maxItems": 3,
            },
            "nextPracticeFocus": {
                "type": "array",
                "items": {"type": "string"},
                "maxItems": 3,
            },
            "confidenceLabel": {
                "type": "string",
                "enum": ["low", "medium", "high"],
            },
            "safetyNote": {"type": ["string", "null"]},
        },
        "required": [
            "summary",
            "strengths",
            "improvementAreas",
            "nextPracticeFocus",
            "confidenceLabel",
            "safetyNote",
        ],
    }


def coaching_report_content_json_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "summary": {"type": "string"},
            "overallAssessment": {"type": "string"},
            "strengths": {
                "type": "array",
                "items": {"type": "string"},
                "maxItems": 4,
            },
            "improvementAreas": {
                "type": "array",
                "items": {"type": "string"},
                "maxItems": 4,
            },
            "nextPracticeFocus": {
                "type": "array",
                "items": {"type": "string"},
                "maxItems": 4,
            },
            "rewrittenAnswer": {"type": "string"},
            "transcriptHighlights": {
                "type": "array",
                "maxItems": 5,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "quote": {"type": "string"},
                        "note": {"type": "string"},
                        "type": {
                            "type": "string",
                            "enum": [
                                "strength",
                                "improvement",
                                "filler",
                                "clarity",
                                "delivery",
                            ],
                        },
                    },
                    "required": ["quote", "note", "type"],
                },
            },
            "scoreSummary": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "overallScore": {"type": "integer"},
                    "clarity": {"type": "integer"},
                    "pace": {"type": "integer"},
                    "delivery": {"type": "integer"},
                    "engagement": {"type": "integer"},
                    "cameraFacing": {"type": "integer"},
                    "label": {"type": "string"},
                },
                "required": [
                    "overallScore",
                    "clarity",
                    "pace",
                    "delivery",
                    "engagement",
                    "cameraFacing",
                    "label",
                ],
            },
            "confidenceLabel": {
                "type": "string",
                "enum": ["low", "medium", "high"],
            },
            "safetyNote": {"type": "string"},
        },
        "required": [
            "summary",
            "overallAssessment",
            "strengths",
            "improvementAreas",
            "nextPracticeFocus",
            "rewrittenAnswer",
            "transcriptHighlights",
            "scoreSummary",
            "confidenceLabel",
            "safetyNote",
        ],
    }

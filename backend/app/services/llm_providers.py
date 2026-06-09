import asyncio
import json
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any

from pydantic import ValidationError

from app.models.coaching import (
    CoachingDraftContent,
    CoachingDraftInput,
    CoachingDraftOutput,
    CoachingReportContent,
    CoachingReportInput,
    CoachingReportOutput,
    LLMProviderName,
    coaching_draft_content_json_schema,
    coaching_report_content_json_schema,
)
from app.services.coaching_report_builder import build_mock_report
from app.services.prompt_builder import build_coaching_messages, build_coaching_report_messages
from app.utils.config import Settings


class CoachingProviderError(Exception):
    def __init__(self, message: str, *, retryable: bool = True) -> None:
        super().__init__(message)
        self.retryable = retryable


class CoachingProviderConfigurationError(CoachingProviderError):
    def __init__(self, message: str) -> None:
        super().__init__(message, retryable=False)


class CoachingProviderMalformedResponseError(CoachingProviderError):
    pass


class BaseCoachingProvider(ABC):
    provider: LLMProviderName

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @abstractmethod
    async def generate_coaching(
        self,
        payload: CoachingDraftInput,
    ) -> CoachingDraftOutput:
        raise NotImplementedError

    @abstractmethod
    async def generate_report(
        self,
        payload: CoachingReportInput,
    ) -> CoachingReportOutput:
        raise NotImplementedError


class MockCoachingProvider(BaseCoachingProvider):
    provider: LLMProviderName = "mock"
    model = "mock-coaching-v1"

    def __init__(
        self,
        settings: Settings,
        *,
        fallback_reason: str | None = None,
    ) -> None:
        super().__init__(settings)
        self.fallback_reason = fallback_reason

    async def generate_coaching(
        self,
        payload: CoachingDraftInput,
    ) -> CoachingDraftOutput:
        metrics = payload.metrics
        score_snapshot = payload.score_snapshot
        breakdown = _dict_value(score_snapshot, "breakdown")
        score_status = str(score_snapshot.get("status", "unknown"))
        overall = _number_value(breakdown, "overall")
        label = str(score_snapshot.get("label", "Incomplete"))
        wpm = _number_value(metrics, "wordsPerMinute")
        filler_rate = _number_value(metrics, "fillerRate")
        camera_facing = _number_value(metrics, "cameraFacingPercent")
        word_count = len(payload.transcript.split())

        strengths: list[str] = []
        improvement_areas: list[str] = []
        next_focus: list[str] = []

        if overall >= 75:
            strengths.append(f"Overall deterministic score is {overall:.0f}/100 ({label}).")
        if wpm and 110 <= wpm <= 170:
            strengths.append(f"Pace is in the target range at about {wpm:.0f} words per minute.")
        if camera_facing >= 70:
            strengths.append("Camera-facing estimate stayed steady for much of the session.")
        if filler_rate <= 5 and word_count >= 20:
            strengths.append("Filler usage appears controlled for this draft.")

        if not strengths:
            strengths.append("You have enough practice signal to begin a concise coaching pass.")

        if wpm and wpm > 170:
            improvement_areas.append("Slow the pace slightly so key points are easier to follow.")
            next_focus.append("Practice the same answer with short pauses between major points.")
        elif wpm and wpm < 110:
            improvement_areas.append("Add a little more forward motion to avoid sounding stalled.")
            next_focus.append("Practice keeping each sentence moving toward a clear endpoint.")

        if filler_rate > 8:
            improvement_areas.append("Reduce filler words by replacing them with brief pauses.")
            next_focus.append("Pause silently before transitions instead of using filler phrases.")

        if camera_facing < 60:
            improvement_areas.append("The camera-facing estimate was low enough to affect engagement.")
            next_focus.append("Keep notes closer to the camera and return to center after checking them.")

        if not improvement_areas:
            improvement_areas.append("Make the answer more memorable by tightening one core takeaway.")
        if not next_focus:
            next_focus.append("Repeat the answer once with a clear opening, evidence point, and close.")

        confidence = "high" if score_status == "ready" and word_count >= 35 else "medium"
        if score_status != "ready" or word_count < 15:
            confidence = "low"

        safety_note = (
            "Mock coaching draft only. Scores are local practice estimates and are not persisted."
        )
        if self.fallback_reason:
            safety_note = f"{safety_note} Returned mock output after provider fallback."

        return CoachingDraftOutput(
            provider="mock",
            model=self.model,
            summary=_summary_for(payload, overall, label),
            strengths=strengths[:3],
            improvementAreas=improvement_areas[:3],
            nextPracticeFocus=next_focus[:3],
            confidenceLabel=confidence,
            safetyNote=safety_note,
            generatedAt=datetime.now(timezone.utc),
        )

    async def generate_report(
        self,
        payload: CoachingReportInput,
    ) -> CoachingReportOutput:
        return build_mock_report(
            payload,
            provider="mock",
            model="mock-report-v1",
            fallback_reason=self.fallback_reason,
        )


class OpenAICoachingProvider(BaseCoachingProvider):
    provider: LLMProviderName = "openai"

    async def generate_coaching(
        self,
        payload: CoachingDraftInput,
    ) -> CoachingDraftOutput:
        if not self.settings.openai_api_key:
            raise CoachingProviderConfigurationError("OPENAI_API_KEY is not configured.")

        try:
            from openai import AsyncOpenAI
        except ImportError as exc:
            raise CoachingProviderConfigurationError(
                "OpenAI Python SDK is not installed. Run pip install -r requirements.txt."
            ) from exc

        system_prompt, user_prompt = build_coaching_messages(payload)
        client = AsyncOpenAI(
            api_key=self.settings.openai_api_key,
            timeout=self.settings.llm_timeout_seconds,
        )

        try:
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=self.settings.openai_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.2,
                    response_format={
                        "type": "json_schema",
                        "json_schema": {
                            "name": "pitchpilot_coaching_draft",
                            "strict": True,
                            "schema": coaching_draft_content_json_schema(),
                        },
                    },
                ),
                timeout=self.settings.llm_timeout_seconds,
            )
        except TimeoutError as exc:
            raise CoachingProviderError("OpenAI provider timed out.") from exc
        except Exception as exc:
            raise CoachingProviderError("OpenAI provider request failed.") from exc

        content = response.choices[0].message.content if response.choices else None
        draft = _validate_content_json(content, "OpenAI")

        return CoachingDraftOutput(
            provider="openai",
            model=self.settings.openai_model,
            summary=draft.summary,
            strengths=draft.strengths,
            improvementAreas=draft.improvement_areas,
            nextPracticeFocus=draft.next_practice_focus,
            confidenceLabel=draft.confidence_label,
            safetyNote=draft.safety_note,
            generatedAt=datetime.now(timezone.utc),
        )

    async def generate_report(
        self,
        payload: CoachingReportInput,
    ) -> CoachingReportOutput:
        if not self.settings.openai_api_key:
            raise CoachingProviderConfigurationError("OPENAI_API_KEY is not configured.")

        try:
            from openai import AsyncOpenAI
        except ImportError as exc:
            raise CoachingProviderConfigurationError(
                "OpenAI Python SDK is not installed. Run pip install -r requirements.txt."
            ) from exc

        system_prompt, user_prompt = build_coaching_report_messages(payload)
        client = AsyncOpenAI(
            api_key=self.settings.openai_api_key,
            timeout=self.settings.llm_timeout_seconds,
        )

        try:
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=self.settings.openai_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.2,
                    response_format={
                        "type": "json_schema",
                        "json_schema": {
                            "name": "pitchpilot_coaching_report",
                            "strict": True,
                            "schema": coaching_report_content_json_schema(),
                        },
                    },
                ),
                timeout=self.settings.llm_timeout_seconds,
            )
        except TimeoutError as exc:
            raise CoachingProviderError("OpenAI provider timed out.") from exc
        except Exception as exc:
            raise CoachingProviderError("OpenAI provider request failed.") from exc

        content = response.choices[0].message.content if response.choices else None
        report = _validate_report_json(content, "OpenAI")

        return CoachingReportOutput(
            provider="openai",
            model=self.settings.openai_model,
            reportId=None,
            generatedAt=datetime.now(timezone.utc),
            mode=payload.mode,
            **report.model_dump(by_alias=True),
        )


class GeminiCoachingProvider(BaseCoachingProvider):
    provider: LLMProviderName = "gemini"

    async def generate_coaching(
        self,
        payload: CoachingDraftInput,
    ) -> CoachingDraftOutput:
        if not self.settings.gemini_api_key:
            raise CoachingProviderConfigurationError("GEMINI_API_KEY is not configured.")

        try:
            from google import genai
        except ImportError as exc:
            raise CoachingProviderConfigurationError(
                "Google Gen AI Python SDK is not installed. Run pip install -r requirements.txt."
            ) from exc

        system_prompt, user_prompt = build_coaching_messages(payload)
        client = genai.Client(api_key=self.settings.gemini_api_key)

        def request() -> Any:
            return client.models.generate_content(
                model=self.settings.gemini_model,
                contents=f"{system_prompt}\n\n{user_prompt}",
                config={
                    "response_mime_type": "application/json",
                    "response_json_schema": coaching_draft_content_json_schema(),
                },
            )

        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(request),
                timeout=self.settings.llm_timeout_seconds,
            )
        except TimeoutError as exc:
            raise CoachingProviderError("Gemini provider timed out.") from exc
        except Exception as exc:
            raise CoachingProviderError("Gemini provider request failed.") from exc

        draft = _validate_content_json(getattr(response, "text", None), "Gemini")

        return CoachingDraftOutput(
            provider="gemini",
            model=self.settings.gemini_model,
            summary=draft.summary,
            strengths=draft.strengths,
            improvementAreas=draft.improvement_areas,
            nextPracticeFocus=draft.next_practice_focus,
            confidenceLabel=draft.confidence_label,
            safetyNote=draft.safety_note,
            generatedAt=datetime.now(timezone.utc),
        )

    async def generate_report(
        self,
        payload: CoachingReportInput,
    ) -> CoachingReportOutput:
        if not self.settings.gemini_api_key:
            raise CoachingProviderConfigurationError("GEMINI_API_KEY is not configured.")

        try:
            from google import genai
        except ImportError as exc:
            raise CoachingProviderConfigurationError(
                "Google Gen AI Python SDK is not installed. Run pip install -r requirements.txt."
            ) from exc

        system_prompt, user_prompt = build_coaching_report_messages(payload)
        client = genai.Client(api_key=self.settings.gemini_api_key)

        def request() -> Any:
            return client.models.generate_content(
                model=self.settings.gemini_model,
                contents=f"{system_prompt}\n\n{user_prompt}",
                config={
                    "response_mime_type": "application/json",
                    "response_json_schema": coaching_report_content_json_schema(),
                },
            )

        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(request),
                timeout=self.settings.llm_timeout_seconds,
            )
        except TimeoutError as exc:
            raise CoachingProviderError("Gemini provider timed out.") from exc
        except Exception as exc:
            raise CoachingProviderError("Gemini provider request failed.") from exc

        report = _validate_report_json(getattr(response, "text", None), "Gemini")

        return CoachingReportOutput(
            provider="gemini",
            model=self.settings.gemini_model,
            reportId=None,
            generatedAt=datetime.now(timezone.utc),
            mode=payload.mode,
            **report.model_dump(by_alias=True),
        )


def _validate_content_json(
    raw_content: str | None,
    provider_label: str,
) -> CoachingDraftContent:
    if not raw_content:
        raise CoachingProviderMalformedResponseError(
            f"{provider_label} provider returned an empty coaching response."
        )

    try:
        data = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        raise CoachingProviderMalformedResponseError(
            f"{provider_label} provider returned malformed JSON."
        ) from exc

    try:
        return CoachingDraftContent.model_validate(data)
    except ValidationError as exc:
        raise CoachingProviderMalformedResponseError(
            f"{provider_label} provider returned JSON that did not match the coaching schema."
        ) from exc


def _validate_report_json(
    raw_content: str | None,
    provider_label: str,
) -> CoachingReportContent:
    if not raw_content:
        raise CoachingProviderMalformedResponseError(
            f"{provider_label} provider returned an empty coaching report."
        )

    try:
        data = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        raise CoachingProviderMalformedResponseError(
            f"{provider_label} provider returned malformed report JSON."
        ) from exc

    try:
        return CoachingReportContent.model_validate(data)
    except ValidationError as exc:
        raise CoachingProviderMalformedResponseError(
            f"{provider_label} provider returned JSON that did not match the report schema."
        ) from exc


def _summary_for(payload: CoachingDraftInput, overall: float, label: str) -> str:
    if overall > 0:
        return (
            f"This {payload.mode.replace('_', ' ')} draft has a {label.lower()} "
            f"practice estimate at {overall:.0f}/100. Focus on one specific improvement "
            "before expanding into a full coaching report."
        )
    return (
        f"This {payload.mode.replace('_', ' ')} draft has limited scoring signal. "
        "Use it as a lightweight practice note, not a final coaching report."
    )


def _dict_value(value: dict[str, Any], key: str) -> dict[str, Any]:
    nested = value.get(key)
    return nested if isinstance(nested, dict) else {}


def _number_value(value: dict[str, Any], key: str) -> float:
    raw = value.get(key)
    if isinstance(raw, (int, float)):
        return float(raw)
    return 0.0

from typing import Literal

from app.models.coaching import (
    CoachingDraftInput,
    CoachingDraftOutput,
    CoachingReportInput,
    CoachingReportOutput,
    CoachingStatusResponse,
    LLMProviderName,
)
from app.services.llm_providers import (
    BaseCoachingProvider,
    CoachingProviderConfigurationError,
    CoachingProviderError,
    GeminiCoachingProvider,
    MockCoachingProvider,
    OpenAICoachingProvider,
)
from app.utils.config import Settings, get_settings


class CoachingInputError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class CoachingOrchestrationError(Exception):
    pass


def build_coaching_status(settings: Settings | None = None) -> CoachingStatusResponse:
    settings = settings or get_settings()
    effective_provider = resolve_effective_provider(settings)

    return CoachingStatusResponse(
        providerConfigured=_normalize_provider_config(settings.llm_provider),
        effectiveProvider=effective_provider,
        openaiConfigured=bool(settings.openai_api_key),
        geminiConfigured=bool(settings.gemini_api_key),
        mockAvailable=True,
        fallbackEnabled=settings.llm_fallback_to_mock,
        timeoutSeconds=settings.llm_timeout_seconds,
        openaiModel=settings.openai_model,
        geminiModel=settings.gemini_model,
        reportSupported=True,
    )


async def generate_coaching_draft(
    payload: CoachingDraftInput,
    settings: Settings | None = None,
) -> CoachingDraftOutput:
    settings = settings or get_settings()
    validate_coaching_input(payload)

    provider = _provider_for(settings)

    try:
        return await _generate_with_retry(provider, payload)
    except CoachingProviderConfigurationError:
        if not settings.llm_fallback_to_mock:
            raise
        return await MockCoachingProvider(
            settings,
            fallback_reason="configuration",
        ).generate_coaching(payload)


async def generate_coaching_report(
    payload: CoachingReportInput,
    settings: Settings | None = None,
) -> CoachingReportOutput:
    settings = settings or get_settings()
    validate_report_input(payload, settings)

    provider = _provider_for(settings)

    try:
        return await _generate_report_with_retry(provider, payload)
    except CoachingProviderConfigurationError:
        if not settings.llm_fallback_to_mock:
            raise
        return await MockCoachingProvider(
            settings,
            fallback_reason="configuration",
        ).generate_report(payload)
    except CoachingProviderError as exc:
        if not settings.llm_fallback_to_mock:
            raise
        return await MockCoachingProvider(
            settings,
            fallback_reason=str(exc),
        ).generate_report(payload)
    except CoachingProviderError as exc:
        if not settings.llm_fallback_to_mock:
            raise
        return await MockCoachingProvider(
            settings,
            fallback_reason=str(exc),
        ).generate_coaching(payload)


def validate_coaching_input(payload: CoachingDraftInput) -> None:
    word_count = len(payload.transcript.split())
    if word_count < 5:
        raise CoachingInputError(
            "insufficient_transcript",
            "Coaching draft requires at least 5 transcript words.",
        )


def validate_report_input(payload: CoachingReportInput, settings: Settings) -> None:
    if payload.dev_force and settings.api_env == "development":
        return

    word_count = len(payload.transcript.split())
    if word_count < 12:
        raise CoachingInputError(
            "insufficient_transcript",
            "AI report requires at least 12 transcript words.",
        )

    status = payload.score_snapshot.get("status")
    
    # If the score snapshot status is missing or not scorable, but we have enough words, recompute it!
    if status not in ("ready", "limited_data") and word_count >= 3:
        from app.services.deterministic_scoring import compute_score_snapshot
        computed = compute_score_snapshot(payload.transcript, payload.metrics, is_final=True)
        payload.score_snapshot = computed
        status = computed.get("status")

    if status not in ("ready", "limited_data"):
        raise CoachingInputError(
            "insufficient_score_data",
            "AI report requires a ready or limited_data deterministic score snapshot.",
        )

    breakdown = payload.score_snapshot.get("breakdown")
    if not isinstance(breakdown, dict) or "overall" not in breakdown:
        raise CoachingInputError(
            "invalid_score_snapshot",
            "Score snapshot must include a breakdown with an overall score.",
        )

    if not isinstance(payload.metrics, dict) or not payload.metrics:
        raise CoachingInputError(
            "insufficient_metrics",
            "AI report requires current realtime metrics.",
        )


def resolve_effective_provider(
    settings: Settings,
) -> LLMProviderName | Literal["unavailable"]:
    configured = _normalize_provider_config(settings.llm_provider)

    if configured == "mock":
        return "mock"
    if configured == "auto":
        if settings.openai_api_key:
            return "openai"
        if settings.gemini_api_key:
            return "gemini"
        return "mock"
    if configured == "openai":
        if settings.openai_api_key:
            return "openai"
        return "mock" if settings.llm_fallback_to_mock else "unavailable"
    if configured == "gemini":
        if settings.gemini_api_key:
            return "gemini"
        return "mock" if settings.llm_fallback_to_mock else "unavailable"
    return "mock"


def _provider_for(settings: Settings) -> BaseCoachingProvider:
    effective = resolve_effective_provider(settings)

    if effective == "openai":
        return OpenAICoachingProvider(settings)
    if effective == "gemini":
        return GeminiCoachingProvider(settings)
    if effective == "mock":
        return MockCoachingProvider(settings)

    raise CoachingProviderConfigurationError(
        f"No LLM provider is available for LLM_PROVIDER={settings.llm_provider!r}."
    )


async def _generate_with_retry(
    provider: BaseCoachingProvider,
    payload: CoachingDraftInput,
) -> CoachingDraftOutput:
    attempts = 2
    last_error: CoachingProviderError | None = None

    for _ in range(attempts):
        try:
            return await provider.generate_coaching(payload)
        except CoachingProviderConfigurationError:
            raise
        except CoachingProviderError as exc:
            last_error = exc
            if not exc.retryable:
                break

    raise last_error or CoachingOrchestrationError("Coaching provider failed.")


async def _generate_report_with_retry(
    provider: BaseCoachingProvider,
    payload: CoachingReportInput,
) -> CoachingReportOutput:
    attempts = 2
    last_error: CoachingProviderError | None = None

    for _ in range(attempts):
        try:
            return await provider.generate_report(payload)
        except CoachingProviderConfigurationError:
            raise
        except CoachingProviderError as exc:
            last_error = exc
            if not exc.retryable:
                break

    raise last_error or CoachingOrchestrationError("Coaching report provider failed.")


def _normalize_provider_config(value: str) -> Literal["auto", "openai", "gemini", "mock"]:
    normalized = value.lower().strip()
    if normalized in {"auto", "openai", "gemini", "mock"}:
        return normalized  # type: ignore[return-value]
    return "auto"

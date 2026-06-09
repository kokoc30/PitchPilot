import asyncio
import json
import re
from typing import Any
from uuid import uuid4

from pydantic import ValidationError

from app.models.resume_questions import (
    ResumeInterviewType,
    ResumeQuestion,
    ResumeQuestionDifficulty,
    ResumeQuestionGenerateRequest,
    ResumeQuestionGenerateResponse,
    ResumeQuestionProvider,
    ResumeRetrievedChunk,
    resume_question_content_json_schema,
)
from app.services.llm_orchestrator import resolve_effective_provider
from app.utils.config import Settings, get_settings


MAX_GROUNDING_PER_QUESTION = 3
MAX_GROUNDING_SNIPPET_CHARS = 180
MAX_SUGGESTED_ANGLE_CHARS = 500
MAX_QUESTION_TEXT_CHARS = 1000
MAX_CHUNK_CHARS_IN_PROMPT = 700


class ResumeQuestionGenerationError(Exception):
    def __init__(self, message: str, *, code: str = "resume_question_error") -> None:
        super().__init__(message)
        self.code = code
        self.message = message


async def generate_resume_questions(
    *,
    resume_id: str,
    request: ResumeQuestionGenerateRequest,
    retrieved_chunks: list[ResumeRetrievedChunk],
    retrieval_method: str,
    settings: Settings | None = None,
) -> ResumeQuestionGenerateResponse:
    settings = settings or get_settings()
    warnings: list[str] = []

    provider_choice = resolve_effective_provider(settings)
    effective_provider: ResumeQuestionProvider
    model_name: str
    questions: list[ResumeQuestion]

    if provider_choice == "openai" and settings.openai_api_key:
        try:
            questions = await _generate_with_openai(
                request=request,
                chunks=retrieved_chunks,
                settings=settings,
            )
            effective_provider = "openai"
            model_name = settings.openai_model
        except _ProviderFailure as exc:
            warnings.append(
                "Question generation provider was unavailable; returning mock questions."
            )
            warnings.append(exc.message)
            questions = _generate_mock_questions(
                request=request,
                chunks=retrieved_chunks,
            )
            effective_provider = "mock"
            model_name = "mock-resume-questions-v1"
    elif provider_choice == "gemini" and settings.gemini_api_key:
        try:
            questions = await _generate_with_gemini(
                request=request,
                chunks=retrieved_chunks,
                settings=settings,
            )
            effective_provider = "gemini"
            model_name = settings.gemini_model
        except _ProviderFailure as exc:
            warnings.append(
                "Question generation provider was unavailable; returning mock questions."
            )
            warnings.append(exc.message)
            questions = _generate_mock_questions(
                request=request,
                chunks=retrieved_chunks,
            )
            effective_provider = "mock"
            model_name = "mock-resume-questions-v1"
    else:
        questions = _generate_mock_questions(
            request=request,
            chunks=retrieved_chunks,
        )
        effective_provider = "mock"
        model_name = "mock-resume-questions-v1"

    if not retrieved_chunks:
        warnings.append(
            "No resume chunks were retrieved. Returned general interview questions only."
        )
    elif retrieval_method == "python_fallback":
        warnings.append(
            "Vector RPC is unavailable, so Python fallback retrieval was used. Apply the match_resume_chunks migration for faster retrieval."
        )

    return ResumeQuestionGenerateResponse(
        resumeId=resume_id,
        provider=effective_provider,
        model=model_name,
        questions=questions[: request.count],
        retrievedChunkCount=len(retrieved_chunks),
        retrievalMethod=retrieval_method,  # type: ignore[arg-type]
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# Mock generator: works without API keys and stays grounded in resume snippets.
# ---------------------------------------------------------------------------

class _ProviderFailure(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


_BEHAVIORAL_TEMPLATES: tuple[str, ...] = (
    "Walk me through a time you worked on {snippet} and what your specific contribution was.",
    "Tell me about a moment in your experience with {snippet} when you had to make a difficult tradeoff.",
    "Describe a setback you faced while working on {snippet} and how you recovered from it.",
)
_TECHNICAL_TEMPLATES: tuple[str, ...] = (
    "Based on your background with {snippet}, what tools or techniques did you rely on, and why?",
    "How would you debug a complex issue in the kind of work you describe as {snippet}?",
    "Take me through the technical design decisions behind {snippet} as listed on your resume.",
)
_PROJECT_TEMPLATES: tuple[str, ...] = (
    "Pick one outcome from {snippet} and walk me through how you achieved it.",
    "What metrics or signals did you use to measure success on {snippet}?",
    "If you started {snippet} over today, what would you change in your approach?",
)
_STARTUP_TEMPLATES: tuple[str, ...] = (
    "Using your experience with {snippet}, how would you frame the customer problem to a non-technical investor?",
    "How does your background in {snippet} prepare you for the ambiguity of an early-stage team?",
    "What scrappy experiment from {snippet} most informs how you think about shipping fast?",
)
_GENERAL_TEMPLATES: tuple[str, ...] = (
    "Your resume mentions {snippet} — can you expand on what that work looked like day to day?",
    "What part of {snippet} are you most proud of, and why?",
    "How does the experience around {snippet} connect to the role you are interviewing for now?",
)

_TEMPLATES_BY_TYPE: dict[ResumeInterviewType, tuple[str, ...]] = {
    "behavioral": _BEHAVIORAL_TEMPLATES,
    "technical": _TECHNICAL_TEMPLATES,
    "project": _PROJECT_TEMPLATES,
    "startup": _STARTUP_TEMPLATES,
    "general": _GENERAL_TEMPLATES,
}

_FALLBACK_GENERAL_QUESTIONS: tuple[tuple[str, str], ...] = (
    (
        "Walk me through your background and why this role interests you.",
        "Intro",
    ),
    (
        "Tell me about a recent project where you had to learn something new quickly.",
        "Behavioral",
    ),
    (
        "Describe a time you disagreed with a teammate and how you resolved it.",
        "Behavioral",
    ),
    (
        "What is a strength you are leaning on right now, and one area you are actively improving?",
        "Self-awareness",
    ),
    (
        "Tell me about a project you owned end to end and what success looked like.",
        "Project",
    ),
    (
        "Describe the most ambiguous problem you have worked on and how you broke it down.",
        "Problem solving",
    ),
    (
        "Walk me through a time you had to make a decision without complete information.",
        "Decision making",
    ),
    (
        "What would you want to learn or accomplish in your first 90 days in this role?",
        "Forward looking",
    ),
)


def _generate_mock_questions(
    *,
    request: ResumeQuestionGenerateRequest,
    chunks: list[ResumeRetrievedChunk],
) -> list[ResumeQuestion]:
    questions: list[ResumeQuestion] = []
    seen_questions: set[str] = set()
    category_for_type = {
        "behavioral": "Behavioral",
        "technical": "Technical",
        "project": "Project",
        "startup": "Startup",
        "general": "General",
    }
    category = category_for_type.get(request.interview_type, "General")
    templates = _TEMPLATES_BY_TYPE.get(request.interview_type, _GENERAL_TEMPLATES)

    for chunk_position, chunk in enumerate(chunks):
        snippet = _extract_snippet(chunk.content)
        if not snippet:
            continue
        template = templates[chunk_position % len(templates)]
        question_text = template.format(snippet=snippet)
        question_text = _decorate_with_focus(question_text, request.focus)
        question_text = _decorate_with_target_role(question_text, request.target_role)

        normalized = question_text.lower().strip()
        if normalized in seen_questions:
            continue
        seen_questions.add(normalized)

        questions.append(
            ResumeQuestion(
                id=f"mock-{uuid4().hex[:10]}",
                question=question_text,
                category=category,
                difficulty=request.difficulty,
                source="resume",
                groundedIn=[_format_grounding(chunk)],
                suggestedAnswerAngle=_mock_answer_angle(request.interview_type, snippet),
                resumeChunkIds=[chunk.id],
            ),
        )
        if len(questions) >= request.count:
            break

    if len(questions) < request.count:
        for question_text, fallback_category in _FALLBACK_GENERAL_QUESTIONS:
            decorated = _decorate_with_target_role(question_text, request.target_role)
            normalized = decorated.lower().strip()
            if normalized in seen_questions:
                continue
            seen_questions.add(normalized)
            questions.append(
                ResumeQuestion(
                    id=f"mock-{uuid4().hex[:10]}",
                    question=decorated,
                    category=fallback_category,
                    difficulty=request.difficulty,
                    source="general",
                    groundedIn=[],
                    suggestedAnswerAngle=None,
                    resumeChunkIds=[],
                ),
            )
            if len(questions) >= request.count:
                break

    return questions[: request.count]


def _extract_snippet(content: str, max_chars: int = 110) -> str:
    if not content:
        return ""
    cleaned = re.sub(r"\s+", " ", content).strip()
    if not cleaned:
        return ""
    # Prefer the first meaningful sentence-like fragment.
    fragments = re.split(r"[.•;\n]+", cleaned)
    snippet = ""
    for fragment in fragments:
        candidate = fragment.strip(" -•*\t")
        if len(candidate) >= 12:
            snippet = candidate
            break
    if not snippet:
        snippet = cleaned[:max_chars].rstrip()
    if len(snippet) > max_chars:
        snippet = snippet[:max_chars].rstrip().rstrip(",") + "…"
    return snippet


def _format_grounding(chunk: ResumeRetrievedChunk) -> str:
    snippet = _extract_snippet(chunk.content, max_chars=MAX_GROUNDING_SNIPPET_CHARS)
    if not snippet:
        return f"Resume chunk #{chunk.chunk_index + 1}"
    return f"Resume chunk #{chunk.chunk_index + 1}: {snippet}"


def _decorate_with_focus(question: str, focus: str | None) -> str:
    if not focus:
        return question
    return f"{question} (Focus: {focus})"


def _decorate_with_target_role(question: str, target_role: str | None) -> str:
    if not target_role:
        return question
    if target_role.lower() in question.lower():
        return question
    return f"{question} How does this connect to a {target_role} role?"


def _mock_answer_angle(
    interview_type: ResumeInterviewType,
    snippet: str,
) -> str:
    base = {
        "behavioral": "Frame this as a Situation → Action → Result story drawn only from this experience.",
        "technical": "Walk through your reasoning and tradeoffs; do not invent tools you did not use.",
        "project": "Anchor on the concrete outcome and what you specifically owned.",
        "startup": "Connect the work to customer value and what you learned shipping under constraints.",
        "general": "Stay specific to the resume detail and avoid generic claims.",
    }
    angle = base.get(interview_type, base["general"])
    if snippet:
        angle = f"{angle} Anchor on: '{snippet}'."
    return angle


# ---------------------------------------------------------------------------
# LLM-backed generators (OpenAI / Gemini). Failures are converted to mock.
# ---------------------------------------------------------------------------


async def _generate_with_openai(
    *,
    request: ResumeQuestionGenerateRequest,
    chunks: list[ResumeRetrievedChunk],
    settings: Settings,
) -> list[ResumeQuestion]:
    try:
        from openai import AsyncOpenAI
    except ImportError as exc:  # pragma: no cover
        raise _ProviderFailure("OpenAI SDK is not installed.") from exc

    system_prompt, user_prompt = _build_resume_question_messages(request, chunks)
    client = AsyncOpenAI(
        api_key=settings.openai_api_key,
        timeout=settings.llm_timeout_seconds,
    )

    try:
        response = await asyncio.wait_for(
            client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "pitchpilot_resume_questions",
                        "strict": True,
                        "schema": resume_question_content_json_schema(),
                    },
                },
            ),
            timeout=settings.llm_timeout_seconds,
        )
    except TimeoutError as exc:
        raise _ProviderFailure("OpenAI provider timed out.") from exc
    except Exception as exc:  # pragma: no cover - network error
        raise _ProviderFailure(f"OpenAI provider error: {exc}") from exc

    content = response.choices[0].message.content if response.choices else None
    return _parse_llm_questions(content, chunks=chunks, request=request)


async def _generate_with_gemini(
    *,
    request: ResumeQuestionGenerateRequest,
    chunks: list[ResumeRetrievedChunk],
    settings: Settings,
) -> list[ResumeQuestion]:
    try:
        from google import genai
    except ImportError as exc:  # pragma: no cover
        raise _ProviderFailure("Google Gen AI SDK is not installed.") from exc

    system_prompt, user_prompt = _build_resume_question_messages(request, chunks)
    client = genai.Client(api_key=settings.gemini_api_key)

    def request_call() -> Any:
        return client.models.generate_content(
            model=settings.gemini_model,
            contents=f"{system_prompt}\n\n{user_prompt}",
            config={
                "response_mime_type": "application/json",
                "response_json_schema": resume_question_content_json_schema(),
            },
        )

    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(request_call),
            timeout=settings.llm_timeout_seconds,
        )
    except TimeoutError as exc:
        raise _ProviderFailure("Gemini provider timed out.") from exc
    except Exception as exc:  # pragma: no cover - network error
        raise _ProviderFailure(f"Gemini provider error: {exc}") from exc

    return _parse_llm_questions(
        getattr(response, "text", None),
        chunks=chunks,
        request=request,
    )


def _build_resume_question_messages(
    request: ResumeQuestionGenerateRequest,
    chunks: list[ResumeRetrievedChunk],
) -> tuple[str, str]:
    system_prompt = (
        "You are PitchPilot AI, an interview coach.\n"
        "Generate interview questions grounded strictly in the candidate's resume snippets.\n"
        "Rules:\n"
        "- Never invent jobs, companies, projects, metrics, certifications, or skills "
        "that are not in the resume snippets.\n"
        "- If a question cannot be grounded in the snippets, mark source as 'general' "
        "and leave resumeChunkIds empty.\n"
        "- Each grounded question must reference at least one resume chunk id from the "
        "list provided.\n"
        "- Return JSON only. No prose, no explanations.\n"
    )
    chunk_lines: list[str] = []
    for chunk in chunks:
        snippet = chunk.content.strip().replace("\n", " ")
        if len(snippet) > MAX_CHUNK_CHARS_IN_PROMPT:
            snippet = snippet[:MAX_CHUNK_CHARS_IN_PROMPT].rstrip() + "…"
        chunk_lines.append(f"- id={chunk.id} | index={chunk.chunk_index}: {snippet}")
    chunk_block = "\n".join(chunk_lines) if chunk_lines else "(no resume snippets available)"

    target_role_line = (
        f"Target role: {request.target_role}"
        if request.target_role
        else "Target role: not provided"
    )
    focus_line = (
        f"Focus area: {request.focus}" if request.focus else "Focus area: not provided"
    )

    user_prompt = "\n\n".join(
        [
            f"Interview type: {request.interview_type}",
            f"Difficulty: {request.difficulty}",
            f"Number of questions: {request.count}",
            target_role_line,
            focus_line,
            "Resume snippets:",
            chunk_block,
            (
                "Return JSON with this shape:\n"
                "{\n"
                "  \"questions\": [\n"
                "    {\n"
                "      \"question\": string,\n"
                "      \"category\": string,\n"
                "      \"difficulty\": \"easy\"|\"medium\"|\"hard\",\n"
                "      \"source\": \"resume\"|\"general\",\n"
                "      \"groundedIn\": string[],\n"
                "      \"suggestedAnswerAngle\": string|null,\n"
                "      \"resumeChunkIds\": string[]\n"
                "    }\n"
                "  ]\n"
                "}"
            ),
        ],
    )
    return system_prompt, user_prompt


def _parse_llm_questions(
    raw_content: str | None,
    *,
    chunks: list[ResumeRetrievedChunk],
    request: ResumeQuestionGenerateRequest,
) -> list[ResumeQuestion]:
    if not raw_content:
        raise _ProviderFailure("LLM returned an empty response.")
    try:
        data = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        raise _ProviderFailure("LLM returned malformed JSON.") from exc

    raw_questions = data.get("questions") if isinstance(data, dict) else None
    if not isinstance(raw_questions, list) or not raw_questions:
        raise _ProviderFailure("LLM response did not include any questions.")

    chunk_lookup = {chunk.id: chunk for chunk in chunks}
    parsed: list[ResumeQuestion] = []
    for item in raw_questions:
        if not isinstance(item, dict):
            continue
        question_text = str(item.get("question") or "").strip()[:MAX_QUESTION_TEXT_CHARS]
        if not question_text:
            continue
        category = str(item.get("category") or "General").strip() or "General"
        difficulty = _coerce_difficulty(item.get("difficulty"), request.difficulty)
        source = str(item.get("source") or "general").strip().lower()
        if source not in {"resume", "general"}:
            source = "general"
        chunk_ids_raw = item.get("resumeChunkIds")
        chunk_ids: list[str] = []
        if isinstance(chunk_ids_raw, list):
            for value in chunk_ids_raw:
                candidate = str(value).strip()
                if candidate and candidate in chunk_lookup:
                    chunk_ids.append(candidate)
        if source == "resume" and not chunk_ids:
            # No verified chunk reference — downgrade so we never claim a false
            # resume citation.
            source = "general"
        grounded = (
            [
                _format_grounding(chunk_lookup[chunk_id])
                for chunk_id in chunk_ids[:MAX_GROUNDING_PER_QUESTION]
            ]
            if source == "resume"
            else []
        )
        suggested = item.get("suggestedAnswerAngle")
        if suggested is not None:
            suggested = str(suggested).strip()[:MAX_SUGGESTED_ANGLE_CHARS] or None

        try:
            parsed.append(
                ResumeQuestion(
                    id=f"llm-{uuid4().hex[:10]}",
                    question=question_text,
                    category=category,
                    difficulty=difficulty,
                    source=source,  # type: ignore[arg-type]
                    groundedIn=grounded,
                    suggestedAnswerAngle=suggested,
                    resumeChunkIds=chunk_ids,
                ),
            )
        except ValidationError:
            continue

    if not parsed:
        raise _ProviderFailure("LLM produced no valid questions.")
    return parsed


def _coerce_difficulty(
    value: Any,
    fallback: ResumeQuestionDifficulty,
) -> ResumeQuestionDifficulty:
    if isinstance(value, str) and value.lower() in {"easy", "medium", "hard"}:
        return value.lower()  # type: ignore[return-value]
    return fallback

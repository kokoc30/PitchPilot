import json
from pathlib import Path
from typing import Any

from app.models.coaching import (
    CoachingDraftInput,
    CoachingReportInput,
    PracticePromptContext,
)

PROMPTS_DIR = Path(__file__).resolve().parents[1] / "prompts"
SYSTEM_PROMPT_PATH = PROMPTS_DIR / "coaching_system.md"
MAX_TRANSCRIPT_CHARS = 6000
MAX_JSON_CHARS = 4500
MAX_GROUNDED_SNIPPET_CHARS = 220


def build_coaching_messages(payload: CoachingDraftInput) -> tuple[str, str]:
    system_prompt = _load_system_prompt()
    sections: list[str] = [
        "Create a Task 11 coaching draft for this PitchPilot AI practice session.",
        f"Practice mode: {payload.mode}",
        _optional_line("User goal", payload.user_goal),
        _optional_line(
            "Practice prompt",
            payload.prompt or _prompt_text_from_context(payload.prompt_context),
        ),
    ]
    sections.extend(_question_context_sections(payload.prompt_context))
    sections.extend(
        [
            _optional_line(
                "Duration seconds",
                f"{payload.duration_seconds:.1f}" if payload.duration_seconds is not None else None,
            ),
            "Transcript:",
            _truncate_text(payload.transcript, MAX_TRANSCRIPT_CHARS),
            "Task 8 metrics JSON:",
            _compact_json(payload.metrics),
            "Task 10 deterministic score snapshot JSON:",
            _compact_json(payload.score_snapshot),
            (
                "Return JSON with exactly these fields: summary, strengths, "
                "improvementAreas, nextPracticeFocus, confidenceLabel, safetyNote. "
                "Use at most 3 strengths, 3 improvement areas, and 3 next practice focuses. "
                "confidenceLabel must be one of low, medium, high."
            ),
        ],
    )
    user_prompt = "\n\n".join(sections)
    return system_prompt, user_prompt


def build_coaching_report_messages(payload: CoachingReportInput) -> tuple[str, str]:
    system_prompt = _load_system_prompt()
    sections: list[str] = [
        "Create a Task 12 full AI coaching report for this PitchPilot AI practice session.",
        f"Practice mode: {payload.mode}",
        f"Generated from: {payload.generated_from}",
        _optional_line("User goal", payload.user_goal),
        _optional_line(
            "Practice prompt",
            payload.prompt or _prompt_text_from_context(payload.prompt_context),
        ),
    ]
    sections.extend(_question_context_sections(payload.prompt_context))
    sections.extend(
        [
            _optional_line(
                "Duration seconds",
                f"{payload.duration_seconds:.1f}" if payload.duration_seconds is not None else None,
            ),
            "Transcript:",
            _truncate_text(payload.transcript, MAX_TRANSCRIPT_CHARS),
            "Final transcript segments JSON:",
            _compact_json(
                {
                    "segments": [
                        segment.model_dump(by_alias=True)
                        for segment in payload.final_transcript_segments
                    ]
                },
            ),
            "Interim text:",
            _truncate_text(payload.interim_text or "", 1000) or "not provided",
            "Task 8 metrics JSON:",
            _compact_json(payload.metrics),
            "Task 10 deterministic score snapshot JSON:",
            _compact_json(payload.score_snapshot),
            _report_instructions(payload.prompt_context),
        ],
    )
    user_prompt = "\n\n".join(sections)
    return system_prompt, user_prompt


def _report_instructions(context: PracticePromptContext | None) -> str:
    base = (
        "Return JSON with exactly these fields: summary, overallAssessment, strengths, "
        "improvementAreas, nextPracticeFocus, rewrittenAnswer, transcriptHighlights, "
        "scoreSummary, confidenceLabel, safetyNote. "
        "Use concise bullets. Include a rewritten version of the user's answer or pitch, "
        "not a different topic. Include transcript highlights with short quotes and notes. "
        "Use camera-facing estimate wording, not perfect eye contact. Scores are practice estimates."
    )
    if not context or not context.text:
        return base
    return (
        f"{base} "
        "The interview question above is the prompt being practiced. "
        "Evaluate how well the transcript actually addresses that question: "
        "include in summary or overallAssessment whether the answer was well, partially, "
        "or not addressed; surface any missed points the question expected; and add at "
        "least one improvementArea or nextPracticeFocus that targets a stronger answer "
        "angle. Anchor any resume-grounded improvement suggestion only on the grounded "
        "references provided — do not invent jobs, projects, skills, metrics, or "
        "experience the candidate did not list. The rewrittenAnswer must answer THIS "
        "question, stay in the candidate's voice, and only reuse facts from the "
        "transcript or the grounded references."
    )


def _question_context_sections(
    context: PracticePromptContext | None,
) -> list[str]:
    if not context or not context.text:
        return []
    sections = [
        "Selected interview question:",
        _truncate_text(context.text, 1000),
    ]
    descriptors: list[str] = []
    if context.category:
        descriptors.append(f"category={context.category}")
    if context.difficulty:
        descriptors.append(f"difficulty={context.difficulty}")
    if context.question_source:
        descriptors.append(f"questionSource={context.question_source}")
    if context.resume_label:
        descriptors.append(f"resumeLabel={_truncate_text(context.resume_label, 120)}")
    if context.source == "resume_question":
        descriptors.append("origin=resume-grounded")
    if descriptors:
        sections.append("Question metadata: " + ", ".join(descriptors))
    if context.suggested_answer_angle:
        sections.append(
            "Suggested answer angle (hint for evaluation, do not quote verbatim): "
            + _truncate_text(context.suggested_answer_angle, 400),
        )
    if context.grounded_in:
        grounded_lines = [
            f"- {_truncate_text(reference, MAX_GROUNDED_SNIPPET_CHARS)}"
            for reference in context.grounded_in
        ]
        sections.extend(
            [
                "Resume-grounded references (already redacted by the question "
                "generator — treat as the only resume detail available; do not "
                "invent additional resume content):",
                "\n".join(grounded_lines),
            ],
        )
    return sections


def _prompt_text_from_context(context: PracticePromptContext | None) -> str | None:
    if context is None:
        return None
    text = (context.text or "").strip()
    return text or None


def _load_system_prompt() -> str:
    try:
        return SYSTEM_PROMPT_PATH.read_text(encoding="utf-8").strip()
    except OSError:
        return (
            "You are PitchPilot AI, a communication practice coach. "
            "Return compact structured JSON only."
        )


def _optional_line(label: str, value: str | None) -> str:
    if not value:
        return f"{label}: not provided"
    return f"{label}: {value}"


def _compact_json(value: dict[str, Any]) -> str:
    try:
        encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)
    except TypeError:
        encoded = "{}"
    return _truncate_text(encoded, MAX_JSON_CHARS)


def _truncate_text(value: str, max_chars: int) -> str:
    if len(value) <= max_chars:
        return value
    return f"{value[:max_chars].rstrip()}...[truncated]"

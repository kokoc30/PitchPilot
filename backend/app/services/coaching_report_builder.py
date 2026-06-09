from datetime import datetime, timezone
from uuid import uuid4

from app.models.coaching import (
    CoachingReportInput,
    CoachingReportOutput,
    PracticePromptContext,
    ScoreSummary,
    TranscriptHighlight,
)


def build_mock_report(
    payload: CoachingReportInput,
    *,
    provider: str = "mock",
    model: str = "mock-report-v1",
    fallback_reason: str | None = None,
) -> CoachingReportOutput:
    metrics = payload.metrics
    score_snapshot = payload.score_snapshot
    breakdown = _dict_value(score_snapshot, "breakdown")
    score_summary = build_score_summary(score_snapshot)
    wpm = _number_value(metrics, "wordsPerMinute")
    filler_rate = _number_value(metrics, "fillerRate")
    camera_facing = _number_value(metrics, "cameraFacingPercent")
    word_count = len(payload.transcript.split())
    context = payload.prompt_context

    summary = _summary(payload, score_summary, context)
    overall_assessment = _overall_assessment(score_summary, context)
    strengths = _strengths(score_summary, wpm, filler_rate, camera_facing)
    improvements = _improvements(wpm, filler_rate, camera_facing, breakdown, context)
    next_focus = _next_focus(improvements, context)
    rewritten = _rewrite_answer(payload, context)
    highlights = _highlights(payload, filler_rate, camera_facing, context)
    confidence = "high" if score_snapshot.get("status") == "ready" and word_count >= 40 else "medium"
    if word_count < 20 or score_snapshot.get("status") != "ready":
        confidence = "low"

    safety_note = (
        "AI coaching report is a practice estimate based on transcript, metrics, and deterministic scores. "
        "It is not persisted and should not be treated as a guaranteed outcome."
    )
    if fallback_reason:
        safety_note = f"{safety_note} Provider fallback returned mock report output."

    return CoachingReportOutput(
        provider=provider,  # type: ignore[arg-type]
        model=model,
        reportId=f"local-{uuid4().hex[:12]}",
        generatedAt=datetime.now(timezone.utc),
        mode=payload.mode,
        summary=summary,
        overallAssessment=overall_assessment,
        strengths=strengths,
        improvementAreas=improvements,
        nextPracticeFocus=next_focus,
        rewrittenAnswer=rewritten,
        transcriptHighlights=highlights,
        scoreSummary=score_summary,
        confidenceLabel=confidence,
        safetyNote=safety_note,
    )


def build_score_summary(score_snapshot: dict) -> ScoreSummary:
    breakdown = _dict_value(score_snapshot, "breakdown")
    return ScoreSummary(
        overallScore=_rounded_score(breakdown, "overall"),
        clarity=_rounded_score(breakdown, "clarity"),
        pace=_rounded_score(breakdown, "pace"),
        delivery=_rounded_score(breakdown, "delivery"),
        engagement=_rounded_score(breakdown, "engagement"),
        cameraFacing=_rounded_score(breakdown, "eyeContact"),
        label=str(score_snapshot.get("label", "Incomplete")),
    )


def _summary(
    payload: CoachingReportInput,
    score_summary: ScoreSummary,
    context: PracticePromptContext | None,
) -> str:
    base = (
        f"Your {payload.mode.replace('_', ' ')} practice run is rated "
        f"{score_summary.label.lower()} at {score_summary.overall_score}/100. "
        "The strongest path forward is to keep the useful structure while tightening one delivery habit."
    )
    if not context or not context.text:
        return base
    fit_label = _question_fit_label(payload, context)
    fit_text = {
        "well": "addresses the selected interview question well",
        "partial": "partially addresses the selected interview question",
        "missed": "does not yet fully address the selected interview question",
    }[fit_label]
    return f"{base} The answer {fit_text}."


def _overall_assessment(
    score_summary: ScoreSummary,
    context: PracticePromptContext | None,
) -> str:
    if score_summary.overall_score >= 80:
        base = (
            "The answer is clear enough for a strong practice pass. The next gains are in sharper "
            "word choice, cleaner transitions, and sustaining the camera-facing estimate."
        )
    elif score_summary.overall_score >= 60:
        base = (
            "The answer has a workable foundation, but it needs a clearer takeaway and steadier "
            "delivery before it feels polished."
        )
    else:
        base = (
            "The session produced enough material to coach, but the answer needs a simpler structure "
            "and more consistent delivery signals."
        )
    if not context or not context.text:
        return base
    addon = (
        " Frame the next attempt explicitly around the interview question, "
        "anchoring claims only on the resume points already surfaced."
    )
    return base + addon


def _strengths(
    score_summary: ScoreSummary,
    wpm: float,
    filler_rate: float,
    camera_facing: float,
) -> list[str]:
    strengths: list[str] = []
    if score_summary.clarity >= 75:
        strengths.append("Clarity estimate is strong enough to make the main point easy to follow.")
    if wpm and 110 <= wpm <= 170:
        strengths.append(f"Pace is in a useful speaking range at about {wpm:.0f} words per minute.")
    if score_summary.delivery >= 75:
        strengths.append("Delivery signals suggest a steady baseline for practice.")
    if camera_facing >= 70:
        strengths.append("Camera-facing estimate stays solid enough to support engagement.")
    if filler_rate <= 5:
        strengths.append("Filler rate is low enough that it does not dominate the answer.")
    return strengths[:4] or ["The answer has enough signal to identify a clear next practice step."]


def _improvements(
    wpm: float,
    filler_rate: float,
    camera_facing: float,
    breakdown: dict,
    context: PracticePromptContext | None = None,
) -> list[str]:
    improvements: list[str] = []
    if context and context.text:
        question_short = _short_quote(context.text)
        improvements.append(
            f"Restate the question in your opening so the answer clearly addresses: '{question_short}'."
        )
        if context.grounded_in:
            improvements.append(
                "Anchor one concrete example on the resume detail you already listed "
                f"(\"{_short_quote(context.grounded_in[0])}\")."
            )
    if wpm > 170:
        improvements.append("Slow down slightly so the strongest points have room to land.")
    elif wpm and wpm < 110:
        improvements.append("Add more forward motion so the answer does not feel stalled.")
    if filler_rate > 8:
        improvements.append("Replace filler words with short silent pauses before transitions.")
    if camera_facing < 65:
        improvements.append("Bring notes closer to the lens and return to center more often.")
    if _number_value(breakdown, "clarity") < 75:
        improvements.append("State the main takeaway earlier and keep each sentence shorter.")
    if _number_value(breakdown, "delivery") < 75:
        improvements.append("Use fewer long pauses and keep posture steady through the close.")
    return improvements[:4] or ["Make the close more memorable by naming the outcome in one sentence."]


def _next_focus(
    improvements: list[str],
    context: PracticePromptContext | None = None,
) -> list[str]:
    focus: list[str] = []
    if context and context.text:
        if context.suggested_answer_angle:
            focus.append(
                "Run the answer again leading with the question's specific angle: "
                + _short_quote(context.suggested_answer_angle)
            )
        else:
            focus.append(
                "Run the answer again, opening with a direct sentence that answers the question."
            )
    focus.append("Run the answer once more with a clear opening, evidence point, and close.")
    if any("filler" in item.lower() for item in improvements):
        focus.append("Practice replacing fillers with one beat of silence.")
    if any("Slow" in item or "forward motion" in item for item in improvements):
        focus.append("Practice the same answer at a measured 110-170 words per minute.")
    if any("center" in item.lower() or "lens" in item.lower() for item in improvements):
        focus.append("Keep reference notes near the camera-facing line.")
    return focus[:4]


def _rewrite_answer(
    payload: CoachingReportInput,
    context: PracticePromptContext | None = None,
) -> str:
    sentences = _sentences(payload.transcript)
    if context and context.text:
        question_short = _short_quote(context.text)
        if not sentences:
            grounded_hint = (
                f" Lean on this resume detail: \"{_short_quote(context.grounded_in[0])}\"."
                if context.grounded_in
                else ""
            )
            return (
                f"To answer \"{question_short}\", I would open with one direct sentence that "
                "names the situation, share one specific example I actually worked on, and close "
                "with the measurable result.{grounded_hint}"
            ).replace("{grounded_hint}", grounded_hint)
        base = " ".join(sentences[:4])
        grounded_hint = (
            f" I would specifically tie this to {_short_quote(context.grounded_in[0])}."
            if context.grounded_in
            else ""
        )
        return (
            f"Here is a tighter answer to \"{question_short}\": {base}"
            f" The key takeaway is the action I took and the measurable result.{grounded_hint}"
        )

    if not sentences:
        return "I would open with the main point, support it with one concrete example, and close with the result."
    base = " ".join(sentences[:4])
    return (
        f"Here is a tighter version: {base} "
        "The key takeaway is that I can explain the situation, name the action I took, "
        "and connect it to a measurable result."
    )


def _question_fit_label(
    payload: CoachingReportInput,
    context: PracticePromptContext | None,
) -> str:
    if not context or not context.text:
        return "missed"
    transcript = (payload.transcript or "").lower()
    if not transcript.strip():
        return "missed"
    question_words = [
        word.strip(".,;:!?")
        for word in context.text.lower().split()
        if len(word.strip(".,;:!?")) >= 4
    ]
    if not question_words:
        return "partial"
    hits = sum(1 for word in question_words if word in transcript)
    ratio = hits / max(1, len(question_words))
    if ratio >= 0.4:
        return "well"
    if ratio >= 0.15:
        return "partial"
    return "missed"


def _highlights(
    payload: CoachingReportInput,
    filler_rate: float,
    camera_facing: float,
    context: PracticePromptContext | None = None,
) -> list[TranscriptHighlight]:
    sentences = _sentences(payload.transcript)
    highlights: list[TranscriptHighlight] = []
    if context and context.text:
        fit = _question_fit_label(payload, context)
        fit_note = {
            "well": "This response engages with the question — keep that direct alignment.",
            "partial": "This response touches the question but should answer it more directly.",
            "missed": "This response drifts from the question — restate it in the opening sentence.",
        }[fit]
        highlights.append(
            TranscriptHighlight(
                quote=_short_quote(context.text),
                note=fit_note,
                type="clarity" if fit == "well" else "improvement",
            )
        )
    if sentences:
        highlights.append(
            TranscriptHighlight(
                quote=_short_quote(sentences[0]),
                note="This is a useful opening anchor. Make the core takeaway explicit right after it.",
                type="clarity",
            )
        )
    if len(sentences) > 1:
        highlights.append(
            TranscriptHighlight(
                quote=_short_quote(sentences[1]),
                note="This detail can become stronger when tied to a measurable result.",
                type="strength",
            )
        )
    if filler_rate > 8:
        highlights.append(
            TranscriptHighlight(
                quote="Detected filler-heavy portions",
                note="Use a short silent pause before continuing instead of filling the transition.",
                type="filler",
            )
        )
    if camera_facing < 65:
        highlights.append(
            TranscriptHighlight(
                quote="Camera-facing estimate",
                note="The visual signal suggests returning to center more often.",
                type="delivery",
            )
        )
    return highlights[:5] or [
        TranscriptHighlight(
            quote=_short_quote(payload.transcript),
            note="Use this material to build a tighter opening, example, and close.",
            type="improvement",
        )
    ]


def _sentences(transcript: str) -> list[str]:
    normalized = " ".join(transcript.split())
    if not normalized:
        return []
    parts = []
    current = []
    for char in normalized:
        current.append(char)
        if char in ".!?":
            sentence = "".join(current).strip()
            if sentence:
                parts.append(sentence)
            current = []
    remainder = "".join(current).strip()
    if remainder:
        parts.append(remainder)
    return parts


def _short_quote(value: str) -> str:
    cleaned = " ".join(value.split())
    if len(cleaned) <= 140:
        return cleaned
    return f"{cleaned[:137].rstrip()}..."


def _dict_value(value: dict, key: str) -> dict:
    nested = value.get(key)
    return nested if isinstance(nested, dict) else {}


def _number_value(value: dict, key: str) -> float:
    raw = value.get(key)
    if isinstance(raw, (int, float)):
        return float(raw)
    return 0.0


def _rounded_score(value: dict, key: str) -> int:
    return max(0, min(100, round(_number_value(value, key))))

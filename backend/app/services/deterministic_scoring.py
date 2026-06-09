import time
from typing import Any, Dict, List

MIN_READY_SECONDS = 10
MIN_READY_WORDS = 3
PACE_MIN_WPM = 110
PACE_MAX_WPM = 170

SCORE_WEIGHTS = {
    "clarity": 0.3,
    "pace": 0.2,
    "delivery": 0.2,
    "engagement": 0.15,
    "eyeContact": 0.15,
}

EMPTY_SCORE_BREAKDOWN = {
    "clarity": 0,
    "pace": 0,
    "delivery": 0,
    "engagement": 0,
    "eyeContact": 0,
    "overall": 0,
}


def clamp_score(value: float) -> int:
    try:
        val = float(value)
    except (TypeError, ValueError):
        return 0
    import math
    if not math.isfinite(val):
        return 0
    return max(0, min(100, int(round(val))))


def get_val(data: Dict[str, Any], camel_key: str, snake_key: str, default: Any = None) -> Any:
    if not data:
        return default
    if camel_key in data and data[camel_key] is not None:
        return data[camel_key]
    if snake_key in data and data[snake_key] is not None:
        return data[snake_key]
    return default


def pauses_per_minute(elapsed_seconds: float, pause_count: int) -> float:
    minutes = max(elapsed_seconds / 60.0, 0.25)
    return pause_count / minutes


def posture_to_score(posture: str) -> int:
    if posture == "upright":
        return 92
    elif posture == "leaning":
        return 68
    elif posture == "not_detected":
        return 52
    else:
        return 45


def engagement_signal_to_score(signal: str) -> int:
    if signal == "strong":
        return 92
    elif signal == "steady":
        return 76
    elif signal == "low":
        return 52
    else:
        return 45


def percent_to_score(percent: float, floor: float) -> int:
    return clamp_score(floor + (clamp_score(percent) / 100.0) * (100.0 - floor))


def speaking_activity_score(speaking_seconds: float, elapsed_seconds: float) -> int:
    if elapsed_seconds <= 0:
        return 0
    speaking_percent = (speaking_seconds / elapsed_seconds) * 100.0
    if 35 <= speaking_percent <= 85:
        return 92
    if speaking_percent < 35:
        return clamp_score(30 + speaking_percent * 1.7)
    return clamp_score(92 - (speaking_percent - 85) * 1.1)


def pause_behavior_score(elapsed_seconds: float, pause_count: int, longest_pause_seconds: float, current_pause_seconds: float) -> int:
    score = 92
    pause_rate = pauses_per_minute(elapsed_seconds, pause_count)
    if pause_rate > 3:
        score -= min(30, (pause_rate - 3) * 7)
    if longest_pause_seconds > 4:
        score -= min(20, (longest_pause_seconds - 4) * 4)
    if current_pause_seconds > 3:
        score -= min(10, (current_pause_seconds - 3) * 3)
    return clamp_score(score)


def calculate_pace_score(elapsed_seconds: float, word_count: int, words_per_minute: float) -> int:
    if elapsed_seconds <= 0 or word_count < MIN_READY_WORDS or words_per_minute <= 0:
        return 0
    if PACE_MIN_WPM <= words_per_minute <= PACE_MAX_WPM:
        return 96
    if words_per_minute < PACE_MIN_WPM:
        return clamp_score(96 - (PACE_MIN_WPM - words_per_minute) * 0.9)
    return clamp_score(96 - (words_per_minute - PACE_MAX_WPM) * 1.15)


def calculate_clarity_score(elapsed_seconds: float, word_count: int, filler_rate: float, pause_count: int, longest_pause_seconds: float) -> int:
    if word_count < MIN_READY_WORDS:
        return 0
    score = 96
    pause_rate = pauses_per_minute(elapsed_seconds, pause_count)
    if filler_rate > 3:
        score -= (filler_rate - 3) * 4.2
    elif filler_rate == 0 and word_count >= 20:
        score += 2
    if pause_rate > 4:
        score -= min(28, (pause_rate - 4) * 6)
    if longest_pause_seconds > 5:
        score -= min(18, (longest_pause_seconds - 5) * 3.5)
    if word_count < 20:
        score -= (20 - word_count) * 0.7
    return clamp_score(score)


def calculate_delivery_score(posture_signal: str, face_visible_percent: float, speaking_seconds: float, elapsed_seconds: float, pause_count: int, longest_pause_seconds: float, current_pause_seconds: float) -> int:
    posture_score = posture_to_score(posture_signal)
    face_score = percent_to_score(face_visible_percent, 35)
    speaking_score = speaking_activity_score(speaking_seconds, elapsed_seconds)
    pause_score = pause_behavior_score(elapsed_seconds, pause_count, longest_pause_seconds, current_pause_seconds)
    return clamp_score(
        posture_score * 0.3 +
        face_score * 0.25 +
        speaking_score * 0.25 +
        pause_score * 0.2
    )


def calculate_engagement_score(engagement_signal: str, face_visible_percent: float, camera_facing_percent: float, speaking_seconds: float, elapsed_seconds: float) -> int:
    signal_score = engagement_signal_to_score(engagement_signal)
    face_score = percent_to_score(face_visible_percent, 35)
    camera_score = percent_to_score(camera_facing_percent, 30)
    audio_score = speaking_activity_score(speaking_seconds, elapsed_seconds)
    return clamp_score(
        signal_score * 0.35 +
        face_score * 0.25 +
        camera_score * 0.25 +
        audio_score * 0.15
    )


def calculate_eye_contact_score(face_visible_percent: float, camera_facing_percent: float) -> int:
    if face_visible_percent <= 0 and camera_facing_percent <= 0:
        return 0
    return clamp_score(
        camera_facing_percent * 0.75 + face_visible_percent * 0.25
    )


def calculate_overall_score(clarity: int, pace: int, delivery: int, engagement: int, eye_contact: int) -> int:
    return clamp_score(
        clarity * SCORE_WEIGHTS["clarity"] +
        pace * SCORE_WEIGHTS["pace"] +
        delivery * SCORE_WEIGHTS["delivery"] +
        engagement * SCORE_WEIGHTS["engagement"] +
        eye_contact * SCORE_WEIGHTS["eyeContact"]
    )


def label_score(score: float, status: str) -> str:
    if status not in ("ready", "limited_data"):
        return "Incomplete"
    rounded = round(score)
    if rounded >= 90:
        return "Excellent"
    if rounded >= 75:
        return "Strong"
    if rounded >= 60:
        return "Developing"
    if rounded >= 40:
        return "Needs focus"
    return "Incomplete"


def has_any_practice_signal(metrics: Dict[str, Any]) -> bool:
    word_count = get_val(metrics, "wordCount", "word_count", 0)
    speaking_seconds = get_val(metrics, "speakingSeconds", "speaking_seconds", 0)
    face_visible_percent = get_val(metrics, "faceVisiblePercent", "face_visible_percent", 0)
    camera_facing_percent = get_val(metrics, "cameraFacingPercent", "camera_facing_percent", 0)
    posture_signal = get_val(metrics, "postureSignal", "posture_signal", "unknown")
    return (
        word_count > 0 or
        speaking_seconds > 0 or
        face_visible_percent > 0 or
        camera_facing_percent > 0 or
        posture_signal in ("upright", "leaning")
    )


def get_score_status(metrics: Dict[str, Any], is_final: bool = False) -> str:
    if not has_any_practice_signal(metrics):
        return "insufficient_data"
    elapsed_seconds = get_val(metrics, "elapsedSeconds", "elapsed_seconds", 0.0)
    word_count = get_val(metrics, "wordCount", "word_count", 0)
    if elapsed_seconds < MIN_READY_SECONDS or word_count < MIN_READY_WORDS:
        if is_final and word_count >= MIN_READY_WORDS:
            return "limited_data"
        return "warming_up"
    return "ready"


def get_score_reasons(status: str, metrics: Dict[str, Any], breakdown: Dict[str, int]) -> List[Dict[str, str]]:
    if status == "insufficient_data":
        return [
            {
                "category": "overall",
                "type": "warning",
                "message": "Start practice signals before scoring. The engine needs transcript, audio, or camera data."
            }
        ]
    if status == "warming_up":
        return [
            {
                "category": "overall",
                "type": "warning",
                "message": "Scoring starts after about 10 seconds and at least 3 transcript words."
            }
        ]

    reasons = []
    if status == "limited_data":
        reasons.append({
            "category": "overall",
            "type": "warning",
            "message": "Score calculated with limited practice time. Speak longer for more robust results."
        })

    clarity = breakdown.get("clarity", 0)
    filler_rate = get_val(metrics, "fillerRate", "filler_rate", 0.0)
    if clarity >= 80:
        reasons.append({
            "category": "clarity",
            "type": "strength",
            "message": "Filler words and long pauses are staying controlled."
        })
    else:
        msg = "Filler words are pulling down the clarity estimate." if filler_rate > 8 else "More concise pauses would improve the clarity estimate."
        reasons.append({
            "category": "clarity",
            "type": "improvement",
            "message": msg
        })

    words_per_minute = get_val(metrics, "wordsPerMinute", "words_per_minute", 0.0)
    if 110 <= words_per_minute <= 170:
        reasons.append({
            "category": "pace",
            "type": "strength",
            "message": "Speaking pace is within the 110-170 words per minute target."
        })
    else:
        msg = "The current pace is above the target range." if words_per_minute > 170 else "The current pace is below the target range."
        reasons.append({
            "category": "pace",
            "type": "improvement",
            "message": msg
        })

    delivery = breakdown.get("delivery", 0)
    posture_signal = get_val(metrics, "postureSignal", "posture_signal", "unknown")
    if posture_signal == "upright" and delivery >= 75:
        reasons.append({
            "category": "delivery",
            "type": "strength",
            "message": "Posture and speaking activity support steady delivery."
        })
    elif delivery < 75:
        reasons.append({
            "category": "delivery",
            "type": "improvement",
            "message": "Delivery is affected by posture, face visibility, or pause behavior."
        })

    engagement = breakdown.get("engagement", 0)
    if engagement >= 75:
        reasons.append({
            "category": "engagement",
            "type": "strength",
            "message": "Face, camera-facing, posture, and audio signals look engaged."
        })
    else:
        reasons.append({
            "category": "engagement",
            "type": "improvement",
            "message": "Engagement improves when your face stays visible and speech remains active."
        })

    camera_facing_percent = get_val(metrics, "cameraFacingPercent", "camera_facing_percent", 0.0)
    face_visible_percent = get_val(metrics, "faceVisiblePercent", "face_visible_percent", 0.0)
    if camera_facing_percent >= 75 and face_visible_percent >= 70:
        reasons.append({
            "category": "camera_facing",
            "type": "strength",
            "message": "Camera-facing signal is steady for most of the session."
        })
    else:
        reasons.append({
            "category": "camera_facing",
            "type": "improvement",
            "message": "Camera-facing score drops when your face is not visible or centered."
        })

    longest_pause_seconds = get_val(metrics, "longestPauseSeconds", "longest_pause_seconds", 0.0)
    if longest_pause_seconds >= 7:
        reasons.append({
            "category": "delivery",
            "type": "warning",
            "message": "A long silence was detected and may interrupt delivery flow."
        })

    return reasons[:7]


def get_improvement_hints(status: str, metrics: Dict[str, Any], breakdown: Dict[str, int]) -> List[str]:
    if status == "insufficient_data":
        return ["Start practice, microphone, streaming, and camera to collect scoring signals."]
    if status == "warming_up":
        return ["Speak for a few more seconds so the scoring estimate has enough signal."]

    hints = []
    if status == "limited_data":
        hints.append("Practice for at least 10 seconds to get more comprehensive feedback.")

    pace = breakdown.get("pace", 0)
    words_per_minute = get_val(metrics, "wordsPerMinute", "words_per_minute", 0.0)
    if pace < 75:
        msg = "Slow slightly and leave short pauses between points." if words_per_minute > 170 else "Add a little more forward motion while keeping words clear."
        hints.append(msg)

    clarity = breakdown.get("clarity", 0)
    filler_rate = get_val(metrics, "fillerRate", "filler_rate", 0.0)
    if clarity < 75:
        msg = "Replace fillers with a brief pause before the next sentence." if filler_rate > 8 else "Use shorter pauses and finish each sentence cleanly."
        hints.append(msg)

    delivery = breakdown.get("delivery", 0)
    if delivery < 75:
        hints.append("Keep shoulders level and reduce long silent gaps.")

    eye_contact = breakdown.get("eyeContact", 0)
    if eye_contact < 75:
        hints.append("Keep notes near the camera and return to center between points.")

    engagement = breakdown.get("engagement", 0)
    if engagement < 75:
        hints.append("Stay visible in frame and keep your voice active through each answer.")

    if not hints:
        hints.append("Maintain this cadence and camera-facing consistency through the full answer.")

    return hints[:4]


def compute_score_snapshot(transcript: str, metrics: Dict[str, Any], is_final: bool = True) -> Dict[str, Any]:
    """Calculate score snapshot deterministically based on transcript and raw metrics."""
    status = get_score_status(metrics, is_final=is_final)
    is_scorable = status in ("ready", "limited_data")

    elapsed_seconds = get_val(metrics, "elapsedSeconds", "elapsed_seconds", 0.0)
    word_count = get_val(metrics, "wordCount", "word_count", 0)
    words_per_minute = get_val(metrics, "wordsPerMinute", "words_per_minute", 0.0)
    filler_rate = get_val(metrics, "fillerRate", "filler_rate", 0.0)
    pause_count = get_val(metrics, "pauseCount", "pause_count", 0)
    longest_pause_seconds = get_val(metrics, "longestPauseSeconds", "longest_pause_seconds", 0.0)
    current_pause_seconds = get_val(metrics, "currentPauseSeconds", "current_pause_seconds", 0.0)
    speaking_seconds = get_val(metrics, "speakingSeconds", "speaking_seconds", 0.0)
    face_visible_percent = get_val(metrics, "faceVisiblePercent", "face_visible_percent", 0.0)
    camera_facing_percent = get_val(metrics, "cameraFacingPercent", "camera_facing_percent", 0.0)
    posture_signal = get_val(metrics, "postureSignal", "posture_signal", "unknown")
    engagement_signal = get_val(metrics, "engagementSignal", "engagement_signal", "unknown")

    if is_scorable:
        clarity = calculate_clarity_score(elapsed_seconds, word_count, filler_rate, pause_count, longest_pause_seconds)
        pace = calculate_pace_score(elapsed_seconds, word_count, words_per_minute)
        delivery = calculate_delivery_score(posture_signal, face_visible_percent, speaking_seconds, elapsed_seconds, pause_count, longest_pause_seconds, current_pause_seconds)
        engagement = calculate_engagement_score(engagement_signal, face_visible_percent, camera_facing_percent, speaking_seconds, elapsed_seconds)
        eye_contact = calculate_eye_contact_score(face_visible_percent, camera_facing_percent)
        overall = calculate_overall_score(clarity, pace, delivery, engagement, eye_contact)

        breakdown = {
            "clarity": clarity,
            "pace": pace,
            "delivery": delivery,
            "engagement": engagement,
            "eyeContact": eye_contact,
            "overall": overall
        }
    else:
        breakdown = EMPTY_SCORE_BREAKDOWN.copy()

    label = label_score(breakdown["overall"], status)
    summary_metrics = {
        "elapsedSeconds": elapsed_seconds,
        "wordCount": word_count,
        "wordsPerMinute": words_per_minute,
        "fillerRate": filler_rate,
        "pauseCount": pause_count,
        "faceVisiblePercent": face_visible_percent,
        "cameraFacingPercent": camera_facing_percent
    }

    return {
        "status": status,
        "label": label,
        "breakdown": breakdown,
        "reasons": get_score_reasons(status, metrics, breakdown),
        "improvementHints": get_improvement_hints(status, metrics, breakdown),
        "generatedAt": int(time.time() * 1000),
        "metricsSummary": summary_metrics
    }

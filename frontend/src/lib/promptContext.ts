import type { SelectedPracticePrompt } from "../app/store";
import type { PracticePromptContextPayload } from "./api";

const MAX_PROMPT_TEXT_CHARS = 1000;
const MAX_GROUNDING_ITEMS = 3;
const MAX_GROUNDING_CHARS = 220;
const MAX_CHUNK_IDS = 8;
const MAX_ANGLE_CHARS = 500;
const MAX_LABEL_CHARS = 120;

export function serializePromptContext(
  prompt: SelectedPracticePrompt | null | undefined,
): PracticePromptContextPayload | null {
  if (!prompt || !prompt.text || !prompt.text.trim()) return null;
  return {
    text: cleanText(prompt.text, MAX_PROMPT_TEXT_CHARS) ?? "",
    source: prompt.source,
    resumeId: prompt.resumeId ?? null,
    resumeLabel: cleanText(prompt.resumeLabel, MAX_LABEL_CHARS),
    questionId: prompt.questionId ?? null,
    category: cleanText(prompt.category, 80),
    difficulty: cleanText(prompt.difficulty, 80),
    questionSource: prompt.questionSource ?? null,
    groundedIn: cleanList(prompt.groundedIn, MAX_GROUNDING_ITEMS, MAX_GROUNDING_CHARS),
    resumeChunkIds: cleanList(prompt.resumeChunkIds, MAX_CHUNK_IDS, 80),
    suggestedAnswerAngle: cleanText(prompt.suggestedAnswerAngle, MAX_ANGLE_CHARS),
  };
}

export function sanitizeSelectedPrompt(
  prompt: SelectedPracticePrompt,
): SelectedPracticePrompt {
  return {
    ...prompt,
    text: cleanText(prompt.text, MAX_PROMPT_TEXT_CHARS) ?? "",
    resumeLabel: cleanText(prompt.resumeLabel, MAX_LABEL_CHARS),
    category: cleanText(prompt.category, 80),
    difficulty: cleanText(prompt.difficulty, 80),
    groundedIn: cleanList(prompt.groundedIn, MAX_GROUNDING_ITEMS, MAX_GROUNDING_CHARS),
    resumeChunkIds: cleanList(prompt.resumeChunkIds, MAX_CHUNK_IDS, 80),
    suggestedAnswerAngle: cleanText(prompt.suggestedAnswerAngle, MAX_ANGLE_CHARS),
  };
}

function cleanList(
  values: string[] | undefined,
  maxItems: number,
  maxChars: number,
): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => cleanText(value, maxChars))
    .filter((value): value is string => Boolean(value))
    .slice(0, maxItems);
}

function cleanText(
  value: string | null | undefined,
  maxChars: number,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxChars);
}

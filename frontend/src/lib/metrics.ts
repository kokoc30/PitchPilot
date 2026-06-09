/**
 * metrics.ts
 *
 * Pure, deterministic utility functions for PitchPilot realtime metrics.
 * All functions are side-effect-free and unit-testable.
 *
 * These are LOCAL ESTIMATES only — not clinical or professional measurements.
 * Final scoring is handled in Task 10.
 */

// ── Filler word list ──────────────────────────────────────────────────────────

/**
 * Multi-word phrases must be listed BEFORE single-word fillers so that
 * phrase matching takes priority and we don't double-count phrase words.
 */
export const FILLER_PHRASES: string[] = [
  "you know",
  "kind of",
  "sort of",
  "i mean",
  "i guess",
];

export const FILLER_WORDS: string[] = [
  "um",
  "uh",
  "like",
  "so",
  "actually",
  "basically",
  "literally",
  "right",
  "okay",
  "well",
];

// ── Pace thresholds ───────────────────────────────────────────────────────────

export const PACE_TOO_SLOW_WPM = 110;
export const PACE_TOO_FAST_WPM = 170;

// Minimum data before we classify pace
export const PACE_MIN_SECONDS = 10;
export const PACE_MIN_WORDS = 3;

// ── Types ─────────────────────────────────────────────────────────────────────

export type PaceStatus = "too_slow" | "good" | "too_fast" | "unknown";

export type FillerWordResult = {
  total: number;
  byWord: Record<string, number>;
};

// ── Word tokenization ─────────────────────────────────────────────────────────

/**
 * Splits a string into lowercase word tokens, stripping punctuation.
 */
export function tokenizeWords(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, " ") // strip punctuation, keep apostrophes
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * Returns the word count of a transcript string.
 */
export function countWords(text: string): number {
  return tokenizeWords(text).length;
}

// ── Filler word detection ─────────────────────────────────────────────────────

/**
 * Counts filler words/phrases in `text`.
 *
 * Algorithm:
 * 1. Normalize to lowercase.
 * 2. Scan for multi-word phrases first (to avoid double-counting).
 * 3. Replace matched phrases with whitespace placeholder.
 * 4. Scan for single-word fillers in the remaining text.
 */
export function countFillerWords(text: string): FillerWordResult {
  if (!text) return { total: 0, byWord: {} };

  let normalized = text.toLowerCase().replace(/[^\w\s']/g, " ");
  const byWord: Record<string, number> = {};
  let total = 0;

  // Pass 1: phrase fillers
  for (const phrase of FILLER_PHRASES) {
    const regex = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "gi");
    const matches = normalized.match(regex);
    if (matches && matches.length > 0) {
      byWord[phrase] = (byWord[phrase] ?? 0) + matches.length;
      total += matches.length;
      // Replace phrase occurrences to avoid double-counting
      normalized = normalized.replace(regex, " ");
    }
  }

  // Pass 2: single-word fillers in what's left
  const words = normalized.split(/\s+/).filter((w) => w.length > 0);
  for (const word of words) {
    if (FILLER_WORDS.includes(word)) {
      byWord[word] = (byWord[word] ?? 0) + 1;
      total += 1;
    }
  }

  return { total, byWord };
}

// ── WPM calculation ───────────────────────────────────────────────────────────

/**
 * Returns words-per-minute. Returns 0 if durationSeconds is zero or negative.
 */
export function calculateWordsPerMinute(
  wordCount: number,
  durationSeconds: number,
): number {
  if (durationSeconds <= 0 || wordCount <= 0) return 0;
  return Math.round((wordCount / durationSeconds) * 60);
}

// ── Filler rate ───────────────────────────────────────────────────────────────

/**
 * Returns filler percentage (0–100). Returns 0 if wordCount is 0.
 */
export function calculateFillerRate(
  fillerCount: number,
  wordCount: number,
): number {
  if (wordCount <= 0) return 0;
  return Math.min(100, Math.round((fillerCount / wordCount) * 100));
}

// ── Pace classification ───────────────────────────────────────────────────────

/**
 * Classifies WPM into a pace bucket.
 * Returns "unknown" when there isn't enough data yet.
 */
export function classifyPace(
  wpm: number,
  durationSeconds: number,
  wordCount: number,
): PaceStatus {
  if (durationSeconds < PACE_MIN_SECONDS || wordCount < PACE_MIN_WORDS) {
    return "unknown";
  }
  if (wpm < PACE_TOO_SLOW_WPM) return "too_slow";
  if (wpm > PACE_TOO_FAST_WPM) return "too_fast";
  return "good";
}

// ── Duration formatting ───────────────────────────────────────────────────────

/**
 * Formats elapsed seconds as mm:ss (e.g. "02:15").
 */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

// ── Generic utilities ─────────────────────────────────────────────────────────

/**
 * Clamps a value between min and max (inclusive).
 */
export function clampMetric(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Returns the top N entries from a byWord map, sorted by count descending.
 */
export function topFillerWords(
  byWord: Record<string, number>,
  n = 3,
): Array<{ word: string; count: number }> {
  return Object.entries(byWord)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

/**
 * chartData.ts
 *
 * Lightweight utilities for rolling-window realtime charts.
 * Keeps recent samples for sparkline visualization without external chart libs.
 */

export type TrendSample = {
  t: number; // epoch ms
  v: number;
};

export const TREND_WINDOW_MS = 60_000; // 60 seconds rolling history
export const TREND_MAX_SAMPLES = 60; // 1 sample per second is plenty

export function pushSample(
  history: TrendSample[],
  value: number,
  now: number = Date.now(),
  windowMs: number = TREND_WINDOW_MS,
  maxSamples: number = TREND_MAX_SAMPLES,
): TrendSample[] {
  const cutoff = now - windowMs;
  const trimmed = history.filter((s) => s.t >= cutoff);
  trimmed.push({ t: now, v: value });
  if (trimmed.length > maxSamples) {
    return trimmed.slice(trimmed.length - maxSamples);
  }
  return trimmed;
}

export function lastValue(history: TrendSample[]): number {
  if (history.length === 0) return 0;
  return history[history.length - 1].v;
}

export function averageValue(history: TrendSample[]): number {
  if (history.length === 0) return 0;
  const total = history.reduce((sum, s) => sum + s.v, 0);
  return total / history.length;
}

export function maxValue(history: TrendSample[]): number {
  if (history.length === 0) return 0;
  return history.reduce((max, s) => (s.v > max ? s.v : max), -Infinity);
}

/**
 * Build an SVG polyline `points` string for an array of values.
 * Scales values to the viewBox using min/max from the data (or supplied bounds).
 */
export function buildSparklinePoints(
  values: number[],
  width: number,
  height: number,
  options?: { min?: number; max?: number; padding?: number },
): string {
  if (values.length === 0) return "";
  const padding = options?.padding ?? 2;
  const innerW = Math.max(1, width - padding * 2);
  const innerH = Math.max(1, height - padding * 2);

  const minVal =
    options?.min ?? values.reduce((m, v) => (v < m ? v : m), Infinity);
  const maxVal =
    options?.max ?? values.reduce((m, v) => (v > m ? v : m), -Infinity);
  const range = maxVal - minVal || 1;

  if (values.length === 1) {
    const y = padding + innerH - ((values[0] - minVal) / range) * innerH;
    return `${padding},${y} ${padding + innerW},${y}`;
  }

  const step = innerW / (values.length - 1);
  return values
    .map((v, i) => {
      const x = padding + i * step;
      const y = padding + innerH - ((v - minVal) / range) * innerH;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/**
 * Build an SVG path for an area chart (closed polygon below the line).
 */
export function buildSparklineAreaPath(
  values: number[],
  width: number,
  height: number,
  options?: { min?: number; max?: number; padding?: number },
): string {
  if (values.length === 0) return "";
  const padding = options?.padding ?? 2;
  const innerW = Math.max(1, width - padding * 2);
  const innerH = Math.max(1, height - padding * 2);

  const minVal =
    options?.min ?? values.reduce((m, v) => (v < m ? v : m), Infinity);
  const maxVal =
    options?.max ?? values.reduce((m, v) => (v > m ? v : m), -Infinity);
  const range = maxVal - minVal || 1;

  const step = values.length > 1 ? innerW / (values.length - 1) : innerW;
  const baseY = padding + innerH;

  const points = values.map((v, i) => {
    const x = padding + (values.length > 1 ? i * step : innerW / 2);
    const y = padding + innerH - ((v - minVal) / range) * innerH;
    return { x, y };
  });

  const head = `M${points[0].x.toFixed(2)},${baseY.toFixed(2)} L${points
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" L")}`;
  return `${head} L${points[points.length - 1].x.toFixed(2)},${baseY.toFixed(2)} Z`;
}

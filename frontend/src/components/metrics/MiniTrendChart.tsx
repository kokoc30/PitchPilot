/**
 * MiniTrendChart
 *
 * Minimal SVG sparkline for the realtime dashboard. No external chart library.
 * Renders an area + line for a rolling array of numeric samples.
 */

import { useMemo } from "react";
import {
  buildSparklineAreaPath,
  buildSparklinePoints,
  type TrendSample,
} from "../../lib/chartData";
import { cn } from "../../lib/utils";

type MiniTrendChartProps = {
  samples: TrendSample[];
  /** Visual stroke + fill accent. Tailwind-compatible CSS class is not used; uses currentColor. */
  accent?: "cyan" | "orange" | "rose" | "success";
  height?: number;
  /** Fixed bounds; if omitted, auto-scale to data. */
  min?: number;
  max?: number;
  /** Optional label shown when no samples exist. */
  emptyLabel?: string;
  className?: string;
};

const accentColors: Record<NonNullable<MiniTrendChartProps["accent"]>, {
  stroke: string;
  fill: string;
}> = {
  cyan: { stroke: "#22D3EE", fill: "rgba(34, 211, 238, 0.16)" },
  orange: { stroke: "#FB923C", fill: "rgba(251, 146, 60, 0.16)" },
  rose: { stroke: "#FDA4AF", fill: "rgba(253, 164, 175, 0.16)" },
  success: { stroke: "#10B981", fill: "rgba(16, 185, 129, 0.16)" },
};

export function MiniTrendChart({
  samples,
  accent = "cyan",
  height = 56,
  min,
  max,
  emptyLabel = "Waiting for data…",
  className,
}: MiniTrendChartProps) {
  const width = 220;
  const colors = accentColors[accent];

  const { polylinePoints, areaPath } = useMemo(() => {
    const values = samples.map((s) => s.v);
    return {
      polylinePoints: buildSparklinePoints(values, width, height, { min, max }),
      areaPath: buildSparklineAreaPath(values, width, height, { min, max }),
    };
  }, [samples, height, min, max]);

  if (samples.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md border border-dashed border-line-2 bg-bg-2/60 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3",
          className,
        )}
        style={{ height }}
        aria-label={emptyLabel}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={cn("w-full", className)}
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      style={{ height }}
    >
      <path d={areaPath} fill={colors.fill} />
      <polyline
        fill="none"
        points={polylinePoints}
        stroke={colors.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
      />
    </svg>
  );
}

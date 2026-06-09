/**
 * RealtimeChartCard
 *
 * Compact dashboard card with four rolling-window sparkline charts driven
 * by the Task 8 metrics + microphone audio level. No external chart lib.
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LineChart } from "lucide-react";
import { MiniTrendChart } from "../metrics/MiniTrendChart";
import { pushSample, type TrendSample } from "../../lib/chartData";
import type { RealtimeMetrics } from "../../hooks/useRealtimeMetrics";

const SAMPLE_INTERVAL_MS = 1000;

type RealtimeChartCardProps = {
  metrics: RealtimeMetrics;
  audioLevel: number;
  isCollecting: boolean;
};

type History = {
  wpm: TrendSample[];
  audio: TrendSample[];
  cameraFacing: TrendSample[];
  fillers: TrendSample[];
};

const EMPTY_HISTORY: History = {
  wpm: [],
  audio: [],
  cameraFacing: [],
  fillers: [],
};

export function RealtimeChartCard({
  metrics,
  audioLevel,
  isCollecting,
}: RealtimeChartCardProps) {
  const [history, setHistory] = useState<History>(EMPTY_HISTORY);
  const metricsRef = useRef(metrics);
  const audioRef = useRef(audioLevel);

  useEffect(() => {
    metricsRef.current = metrics;
    audioRef.current = audioLevel;
  });

  // Reset chart history when collection stops
  useEffect(() => {
    if (!isCollecting) {
      setHistory(EMPTY_HISTORY);
    }
  }, [isCollecting]);

  useEffect(() => {
    if (!isCollecting) return undefined;
    const id = window.setInterval(() => {
      const now = Date.now();
      const m = metricsRef.current;
      const a = audioRef.current;
      setHistory((prev) => ({
        wpm: pushSample(prev.wpm, m.wordsPerMinute, now),
        audio: pushSample(prev.audio, Math.round(a * 100), now),
        cameraFacing: pushSample(prev.cameraFacing, m.cameraFacingPercent, now),
        fillers: pushSample(prev.fillers, m.fillerWordCount, now),
      }));
    }, SAMPLE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isCollecting]);

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="rounded-md border border-line-2 bg-bg-2 p-5 shadow-card"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-cyan-300" aria-hidden="true" />
          <h2 className="text-[15px] font-medium text-ink-0">
            Realtime trends
          </h2>
        </div>
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
          Last 60s · sampled every 1s
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <ChartTile
          accent="cyan"
          caption={`Latest ${metrics.wordsPerMinute || 0} wpm`}
          label="Words / minute"
          min={0}
          max={Math.max(220, ...history.wpm.map((s) => s.v))}
          samples={history.wpm}
        />
        <ChartTile
          accent="cyan"
          caption={`Latest ${Math.round(audioLevel * 100)}/100 level`}
          label="Audio activity"
          min={0}
          max={100}
          samples={history.audio}
        />
        <ChartTile
          accent="orange"
          caption={`Latest ${metrics.fillerWordCount} filler${metrics.fillerWordCount === 1 ? "" : "s"}`}
          label="Filler count"
          min={0}
          max={Math.max(5, ...history.fillers.map((s) => s.v))}
          samples={history.fillers}
        />
        <ChartTile
          accent="cyan"
          caption={`Latest ${metrics.cameraFacingPercent}% center`}
          label="Camera-facing"
          min={0}
          max={100}
          samples={history.cameraFacing}
        />
      </div>

      <p className="mt-4 text-[11px] text-ink-3">
        Trends reset between sessions. Local only.
      </p>
    </motion.section>
  );
}

// â”€â”€ Tile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ChartTileProps = {
  label: string;
  caption: string;
  samples: TrendSample[];
  min: number;
  max: number;
  accent: "cyan" | "orange" | "rose" | "success";
};

function ChartTile({
  label,
  caption,
  samples,
  min,
  max,
  accent,
}: ChartTileProps) {
  return (
    <div className="rounded-md border border-line-2 bg-bg-3 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
          {label}
        </p>
        <p className="font-mono text-[11px] font-medium text-ink-1 tabular-nums">{caption}</p>
      </div>
      <div className="mt-2">
        <MiniTrendChart
          accent={accent}
          emptyLabel="No data yet"
          height={64}
          max={max}
          min={min}
          samples={samples}
        />
      </div>
    </div>
  );
}

import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";

type AudioLevelMeterProps = {
  level: number;
  isActive: boolean;
  className?: string;
};

function levelLabel(level: number) {
  if (level >= 0.6) return "loud";
  if (level >= 0.2) return "normal";
  return "quiet";
}

function levelTone(level: number) {
  if (level >= 0.7) return "bg-rose-400";
  if (level >= 0.45) return "bg-amber-300";
  return "bg-cyan-400";
}

export function AudioLevelMeter({
  level,
  isActive,
  className,
}: AudioLevelMeterProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const safeLevel = Math.max(0, Math.min(1, isActive ? level : 0));
    const bar = barRef.current;
    const number = numberRef.current;
    if (bar) {
      bar.style.width = `${Math.round(safeLevel * 100)}%`;
    }
    if (number) {
      number.textContent = safeLevel.toFixed(2);
    }
  }, [isActive, level]);

  const label = isActive ? levelLabel(level) : "idle";
  const toneClass = isActive ? levelTone(level) : "bg-zinc-700";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-zinc-500">
        <span>Live input level</span>
        <span className="text-zinc-300">{label}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full border border-zinc-800 bg-zinc-900">
        <div
          aria-hidden="true"
          className={cn("h-full transition-[width] duration-75 ease-out", toneClass)}
          ref={barRef}
          style={{ width: "0%" }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> quiet
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> loud
          </span>
        </div>
        <span className="font-mono text-zinc-300">
          rms <span ref={numberRef}>0.00</span>
        </span>
      </div>
    </div>
  );
}

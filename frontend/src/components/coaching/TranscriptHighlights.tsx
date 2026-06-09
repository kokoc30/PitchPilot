import { MessageSquareQuote } from "lucide-react";
import type { TranscriptHighlight } from "../../lib/api";
import { cn } from "../../lib/utils";

type TranscriptHighlightsProps = {
  highlights: TranscriptHighlight[];
};

const typeStyles: Record<TranscriptHighlight["type"], string> = {
  strength: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  improvement: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  filler: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  clarity: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  delivery: "border-rose-400/25 bg-rose-400/10 text-rose-200",
};

export function TranscriptHighlights({ highlights }: TranscriptHighlightsProps) {
  if (highlights.length === 0) {
    return (
      <p className="text-sm leading-6 text-zinc-500">
        No transcript highlights were returned for this report.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {highlights.map((highlight) => (
        <div
          className="rounded-lg border border-zinc-800 bg-zinc-950/55 p-3"
          key={`${highlight.type}-${highlight.quote}-${highlight.note}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                typeStyles[highlight.type],
              )}
            >
              {highlight.type.replace("_", " ")}
            </span>
          </div>
          <blockquote className="mt-2 text-sm leading-6 text-zinc-200">
            "{highlight.quote}"
          </blockquote>
          <p className="mt-2 text-xs leading-5 text-zinc-500">{highlight.note}</p>
        </div>
      ))}
    </div>
  );
}

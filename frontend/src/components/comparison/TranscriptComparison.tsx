import { FileText, MessageSquareText } from "lucide-react";
import type { AttemptSnapshot, RetryComparison } from "../../lib/comparison";
import { formatDelta } from "../../lib/comparison";

type TranscriptComparisonProps = {
  baseline: AttemptSnapshot;
  retry: AttemptSnapshot;
  comparison: RetryComparison;
};

export function TranscriptComparison({
  baseline,
  retry,
  comparison,
}: TranscriptComparisonProps) {
  const wordDelta = comparison.transcriptWordDelta;
  const lengthNote =
    wordDelta > 0
      ? `Retry had ${wordDelta} more words. Treat that as more content, not automatically better.`
      : wordDelta < 0
        ? `Retry had ${Math.abs(wordDelta)} fewer words. Treat that as tighter content, not automatically better.`
        : "Retry and baseline had the same transcript length.";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-cyan-300" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white">
            Transcript comparison
          </h3>
        </div>
        <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-2.5 py-1 text-xs font-medium text-zinc-300">
          {formatDelta(wordDelta, "words")}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-zinc-300">{lengthNote}</p>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <TranscriptPreview
          label="Baseline"
          transcript={baseline.transcript}
          wordCount={baseline.wordCount}
        />
        <TranscriptPreview
          label="Retry"
          transcript={retry.transcript}
          wordCount={retry.wordCount}
        />
      </div>

      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
        <MiniStat
          label="Pace"
          value={`${baseline.wordsPerMinute} to ${retry.wordsPerMinute} wpm`}
        />
        <MiniStat
          label="Fillers"
          value={`${baseline.fillerWordCount} to ${retry.fillerWordCount}`}
        />
        <MiniStat
          label="Camera-facing"
          value={`${baseline.cameraFacingPercent}% to ${retry.cameraFacingPercent}%`}
        />
      </div>
    </div>
  );
}

function TranscriptPreview({
  label,
  transcript,
  wordCount,
}: {
  label: string;
  transcript: string;
  wordCount: number;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/55 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquareText
            className="h-3.5 w-3.5 text-zinc-500"
            aria-hidden="true"
          />
          <p className="text-xs font-semibold text-zinc-200">{label}</p>
        </div>
        <span className="text-[11px] text-zinc-500">{wordCount} words</span>
      </div>
      <p className="mt-2 line-clamp-4 text-xs leading-5 text-zinc-400">
        {transcript ? transcript : "No transcript text was saved for this attempt."}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/55 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

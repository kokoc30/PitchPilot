import { useEffect, useMemo, useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import type { PracticeMode } from "../../app/store";
import type { RealtimeMetrics } from "../../hooks/useRealtimeMetrics";
import type { ScoreSnapshot } from "../../lib/scoring";
import {
  generateCoachingDraft,
  getCoachingStatus,
  type CoachingDraftOutput,
  type CoachingMode,
  type CoachingStatusResponse,
} from "../../lib/api";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";

type CoachingDevPanelProps = {
  mode: PracticeMode;
  metrics: RealtimeMetrics;
  scoreSnapshot: ScoreSnapshot;
  transcript: string;
};

export function CoachingDevPanel({
  mode,
  metrics,
  scoreSnapshot,
  transcript,
}: CoachingDevPanelProps) {
  const [status, setStatus] = useState<CoachingStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CoachingDraftOutput | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    let mounted = true;
    void getCoachingStatus().then((result) => {
      if (!mounted) return;
      setStatus(result.data);
      setStatusError(result.error);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const transcriptWordCount = useMemo(
    () => transcript.trim().split(/\s+/).filter(Boolean).length,
    [transcript],
  );

  const canGenerate =
    transcriptWordCount >= 5 &&
    scoreSnapshot.status === "ready" &&
    !isGenerating;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setDraftError(null);
    const result = await generateCoachingDraft({
      transcript,
      mode: mapPracticeMode(mode),
      metrics: metrics as unknown as Record<string, unknown>,
      scoreSnapshot: scoreSnapshot as unknown as Record<string, unknown>,
      durationSeconds: metrics.elapsedSeconds,
    });
    setDraft(result.data);
    setDraftError(result.error);
    setIsGenerating(false);
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/72 p-5 shadow-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/20">
            <Bot className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                LLM orchestration dev panel
              </h2>
              <StatusBadge
                label={status?.effectiveProvider ?? "checking"}
                tone={status?.effectiveProvider ? "online" : "pending"}
              />
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Task 11 draft only. This is not the final coaching report UI.
            </p>
          </div>
        </div>

        <Button
          disabled={!canGenerate}
          icon={
            isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )
          }
          onClick={handleGenerate}
          size="sm"
          variant="secondary"
        >
          Generate draft
        </Button>
      </div>

      <div className="mt-4 grid gap-3 text-xs text-zinc-400 sm:grid-cols-3">
        <StatusTile label="Configured" value={status?.providerConfigured ?? "--"} />
        <StatusTile
          label="Fallback"
          value={status ? (status.fallbackEnabled ? "enabled" : "disabled") : "--"}
        />
        <StatusTile
          label="Input"
          value={
            scoreSnapshot.status === "ready"
              ? `${transcriptWordCount} words, score ready`
              : scoreSnapshot.status.replace("_", " ")
          }
        />
      </div>

      {statusError && (
        <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-400/5 px-3 py-2 text-xs text-rose-200">
          {statusError}
        </p>
      )}

      {!canGenerate && !draftError && (
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          Generate becomes available after at least 5 transcript words and a
          ready deterministic score snapshot.
        </p>
      )}

      {draftError && (
        <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-400/5 px-3 py-2 text-xs text-rose-200">
          {draftError}
        </p>
      )}

      {draft && (
        <div className="mt-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/45 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={draft.provider} tone="online" />
            <span className="text-xs text-zinc-500">{draft.model}</span>
            <span className="text-xs text-zinc-500">
              confidence: {draft.confidenceLabel}
            </span>
          </div>
          <p className="text-sm leading-6 text-zinc-200">{draft.summary}</p>
          <DraftList title="Strengths" items={draft.strengths} />
          <DraftList title="Improvement areas" items={draft.improvementAreas} />
          <DraftList title="Next focus" items={draft.nextPracticeFocus} />
          {draft.safetyNote && (
            <p className="text-xs leading-5 text-zinc-500">{draft.safetyNote}</p>
          )}
        </div>
      )}
    </section>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 font-medium text-zinc-300">{value}</p>
    </div>
  );
}

function DraftList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <ul className="mt-1 space-y-1.5">
        {items.map((item) => (
          <li className="text-xs leading-5 text-zinc-300" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function mapPracticeMode(mode: PracticeMode): CoachingMode {
  switch (mode) {
    case "pitch":
      return "startup_pitch";
    case "elevator":
      return "elevator_pitch";
    case "class":
      return "presentation";
    case "interview":
    case "presentation":
    case "custom":
      return mode;
  }
}

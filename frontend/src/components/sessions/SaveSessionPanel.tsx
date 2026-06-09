import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "../../app/store";
import type { PracticeMode, SelectedPracticePrompt } from "../../app/store";
import type { CoachingReportOutput } from "../../lib/api";
import type { RetryComparison } from "../../lib/comparison";
import type { RealtimeMetrics } from "../../hooks/useRealtimeMetrics";
import type { ScoreSnapshot } from "../../lib/scoring";
import { serializePromptContext } from "../../lib/promptContext";
import { useSessionPersistence } from "../../hooks/useSessionPersistence";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { SavedSessionsList } from "./SavedSessionsList";

type SaveSessionPanelProps = {
  mode: PracticeMode;
  durationSeconds: number;
  transcript: string;
  finalSegments: Array<Record<string, unknown>>;
  metrics: RealtimeMetrics;
  scoreSnapshot: ScoreSnapshot;
  coachingReport: CoachingReportOutput | null;
  retryComparison: RetryComparison | null;
  selectedPrompt?: SelectedPracticePrompt | null;
};

export function SaveSessionPanel({
  mode,
  durationSeconds,
  transcript,
  finalSegments,
  metrics,
  scoreSnapshot,
  coachingReport,
  retryComparison,
  selectedPrompt,
}: SaveSessionPanelProps) {
  const [title, setTitle] = useState("");
  const isDemoMode = useAppStore((state) => state.isDemoMode);
  const persistence = useSessionPersistence();

  const hasTranscript = transcript.trim().length > 0;
  const hasScore = scoreSnapshot.status === "ready";
  const hasReport = Boolean(coachingReport);
  const hasRetryComparison = Boolean(retryComparison);
  const canSave = hasTranscript || hasScore || hasReport;

  const hasSelectedPrompt = Boolean(selectedPrompt?.text?.trim());
  const saveSummary = useMemo(
    () => [
      {
        label: "Transcript",
        value: hasTranscript ? `${metrics.wordCount} words` : "not available",
        enabled: hasTranscript,
        icon: FileText,
      },
      {
        label: "Metrics",
        value: metrics.elapsedSeconds > 0 ? "snapshot" : "minimal",
        enabled: metrics.elapsedSeconds > 0,
        icon: Database,
      },
      {
        label: "Score",
        value: hasScore ? `${scoreSnapshot.breakdown.overall}` : "not ready",
        enabled: hasScore,
        icon: CheckCircle2,
      },
      {
        label: "AI report",
        value: hasReport ? "included" : "not included",
        enabled: hasReport,
        icon: Sparkles,
      },
      {
        label: "Retry comparison",
        value: hasRetryComparison ? "included" : "not included",
        enabled: hasRetryComparison,
        icon: Save,
      },
      {
        label: "Practiced question",
        value: hasSelectedPrompt
          ? selectedPrompt!.source === "resume_question"
            ? "from resume"
            : "manual"
          : "not selected",
        enabled: hasSelectedPrompt,
        icon: FileText,
      },
    ],
    [
      hasReport,
      hasRetryComparison,
      hasScore,
      hasSelectedPrompt,
      hasTranscript,
      metrics.elapsedSeconds,
      metrics.wordCount,
      scoreSnapshot.breakdown.overall,
      selectedPrompt,
    ],
  );

  useEffect(() => {
    void persistence.loadSessions();
    // Load once when the panel mounts so refresh proves persistence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) {
      const wordCount = metrics.wordCount;
      const overall = scoreSnapshot.breakdown.overall;
      if (wordCount >= 3 && overall === 0) {
        console.warn(
          `[PitchPilot DEV WARNING] Saving session with ${wordCount} words, but score is 0. Status: ${scoreSnapshot.status}`,
        );
      }
    }
  }, [metrics.wordCount, scoreSnapshot]);

  const handleSave = async () => {
    let finalTitle = title.trim();
    if (isDemoMode && finalTitle && !finalTitle.startsWith("[Demo]")) {
      finalTitle = `[Demo] ${finalTitle}`;
    } else if (isDemoMode && !finalTitle) {
      finalTitle = `[Demo] ${modeLabel(mode)} practice`;
    }

    const saved = await persistence.saveSession({
      mode,
      title: finalTitle || null,
      durationSeconds,
      transcript,
      finalSegments,
      metrics: metrics as unknown as Record<string, unknown>,
      scoreSnapshot: scoreSnapshot as unknown as Record<string, unknown>,
      coachingReport: coachingReport as unknown as Record<string, unknown> | null,
      retryComparison: retryComparison as unknown as Record<string, unknown> | null,
      selectedPrompt: serializePromptContext(selectedPrompt),
    });

    if (saved && !title.trim()) {
      setTitle(saved.title ?? "");
    }
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/72 p-5 shadow-panel">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/20">
            <Database className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                Save practice session
              </h2>
              <StatusBadge label="Supabase" tone="pending" />
              <StatusBadge label="no audio/video" tone="offline" />
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">
              Save the completed attempt to Supabase through the authenticated
              backend. The backend derives ownership from your bearer token.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!canSave || persistence.saveStatus === "saving"}
            icon={
              persistence.saveStatus === "saving" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )
            }
            onClick={() => void handleSave()}
            size="sm"
          >
            {persistence.saveStatus === "saving" ? "Saving" : "Save Session"}
          </Button>
          <Button
            onClick={() => void persistence.loadSessions()}
            size="sm"
            variant="ghost"
          >
            Load saved
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Session title
            </span>
            <input
              className="mt-2 h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={isDemoMode ? `[Demo] ${modeLabel(mode)} practice` : `${modeLabel(mode)} practice`}
              value={title}
            />
          </label>

          {isDemoMode && (
            <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.05] p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                <p className="text-sm leading-5 text-amber-100">
                  <span className="font-semibold">Demo mode:</span> Saving will persist this demo data to your account.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {saveSummary.map((item) => (
              <SaveSummaryItem
                enabled={item.enabled}
                icon={<item.icon className="h-3.5 w-3.5" aria-hidden="true" />}
                key={item.label}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>

          {!canSave && (
            <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.05] p-4">
              <p className="text-sm leading-6 text-amber-100">
                Run a practice attempt first. Saving is enabled once transcript,
                score, or report data exists.
              </p>
            </div>
          )}

          {persistence.saveStatus === "saved" && persistence.lastSavedSession && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.05] p-4">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"
                aria-hidden="true"
              />
              <p className="text-sm leading-6 text-emerald-100">
                Saved session {persistence.lastSavedSession.title || "practice attempt"}.
              </p>
            </div>
          )}

          {persistence.error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-400/25 bg-rose-400/[0.05] p-4">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-300"
                aria-hidden="true"
              />
              <p className="text-sm leading-6 text-rose-100">
                {persistence.error}
              </p>
            </div>
          )}
        </div>

        <SavedSessionsList
          isLoading={persistence.loadStatus === "loading"}
          onDeleteSession={(sessionId) => void persistence.deleteSession(sessionId)}
          onLoadSession={(sessionId) => void persistence.loadSession(sessionId)}
          onRefresh={() => void persistence.loadSessions()}
          sessions={persistence.savedSessions}
          selectedSession={persistence.selectedSession}
        />
      </div>
    </section>
  );
}

function SaveSummaryItem({
  label,
  value,
  enabled,
  icon,
}: {
  label: string;
  value: string;
  enabled: boolean;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-zinc-500">
          {icon}
          <p className="text-[10px] font-semibold uppercase tracking-wide">
            {label}
          </p>
        </div>
        <span
          className={
            enabled
              ? "h-2 w-2 rounded-full bg-emerald-300"
              : "h-2 w-2 rounded-full bg-zinc-700"
          }
        />
      </div>
      <p className="mt-1 text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function modeLabel(mode: PracticeMode): string {
  switch (mode) {
    case "pitch":
      return "Startup Pitch";
    case "class":
      return "Class Presentation";
    case "elevator":
      return "Elevator Pitch";
    case "interview":
      return "Interview";
    case "presentation":
      return "Presentation";
    case "custom":
      return "Custom";
  }
}

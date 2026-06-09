import { Eye, RefreshCw, Trash2 } from "lucide-react";
import type {
  SavedPracticeSessionDetail,
  SavedPracticeSessionSummary,
} from "../../lib/api";
import { formatDuration } from "../../lib/metrics";
import { Button } from "../ui/Button";

type SavedSessionsListProps = {
  sessions: SavedPracticeSessionSummary[];
  selectedSession: SavedPracticeSessionDetail | null;
  isLoading: boolean;
  onRefresh: () => void;
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
};

export function SavedSessionsList({
  sessions,
  selectedSession,
  isLoading,
  onRefresh,
  onLoadSession,
  onDeleteSession,
}: SavedSessionsListProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Recent saved sessions
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Basic save/load list for Task 14. Full analytics arrives in Task 15.
          </p>
        </div>
        <Button
          disabled={isLoading}
          icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={onRefresh}
          size="sm"
          variant="ghost"
        >
          {isLoading ? "Loading" : "Refresh"}
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-zinc-800 bg-zinc-950/45 p-4 text-sm text-zinc-500">
          No saved sessions loaded yet.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {sessions.map((session) => (
            <SavedSessionRow
              isSelected={selectedSession?.id === session.id}
              key={session.id}
              onDelete={() => onDeleteSession(session.id)}
              onLoad={() => onLoadSession(session.id)}
              session={session}
            />
          ))}
        </div>
      )}

      {selectedSession && (
        <div className="mt-4 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.05] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
                Loaded session
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {selectedSession.title || modeLabel(selectedSession.mode)}
              </p>
            </div>
            <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-xs font-medium text-cyan-100">
              {selectedSession.transcript.wordCount} words
            </span>
          </div>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            <MiniStat
              label="Score"
              value={
                selectedSession.overallScore !== null
                  ? `${selectedSession.overallScore}`
                  : "--"
              }
            />
            <MiniStat
              label="Report"
              value={selectedSession.coachingReport ? "saved" : "not saved"}
            />
            <MiniStat
              label="Retry"
              value={selectedSession.retryComparison ? "saved" : "not saved"}
            />
          </div>
          <p className="mt-3 line-clamp-3 text-xs leading-5 text-zinc-400">
            {selectedSession.transcript.fullTranscript ||
              "This saved session has no transcript text."}
          </p>
        </div>
      )}
    </div>
  );
}

function SavedSessionRow({
  session,
  isSelected,
  onLoad,
  onDelete,
}: {
  session: SavedPracticeSessionSummary;
  isSelected: boolean;
  onLoad: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950/55 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-zinc-100">
          {session.title || modeLabel(session.mode)}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {formatSavedAt(session.createdAt)} / {formatDuration(session.durationSeconds)} /{" "}
          {session.wordsPerMinute ?? "--"} wpm / score{" "}
          {session.overallScore ?? "--"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          icon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={onLoad}
          size="sm"
          variant={isSelected ? "secondary" : "ghost"}
        >
          {isSelected ? "Loaded" : "Load"}
        </Button>
        <Button
          icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={onDelete}
          size="sm"
          variant="ghost"
        >
          Delete
        </Button>
      </div>
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

function formatSavedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "saved locally";
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function modeLabel(mode: string): string {
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
    default:
      return mode;
  }
}

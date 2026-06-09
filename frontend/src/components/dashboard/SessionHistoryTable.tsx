import { useState, useMemo } from "react";
import type { SavedPracticeSessionSummary } from "../../lib/api";
import { Card } from "../ui/Card";
import { titleCase } from "../../lib/utils";
import { Calendar, Clock, BarChart2, MessageSquare, Trash2, ChevronRight, Camera } from "lucide-react";

export type SessionHistoryTableProps = {
  sessions: SavedPracticeSessionSummary[];
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  isDeleting: boolean;
};

export function SessionHistoryTable({ sessions, onSelect, onDelete, isDeleting }: SessionHistoryTableProps) {
  const [filterMode, setFilterMode] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchMode = filterMode === "all" || s.mode === filterMode;
      const matchSearch = search === "" || 
        (s.title?.toLowerCase().includes(search.toLowerCase())) ||
        (s.mode.toLowerCase().includes(search.toLowerCase()));
      return matchMode && matchSearch;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sessions, filterMode, search]);

  const uniqueModes = useMemo(() => {
    const modes = new Set(sessions.map(s => s.mode));
    return Array.from(modes);
  }, [sessions]);

  if (sessions.length === 0) return null;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-[15px] font-medium text-ink-0">History</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-[7px] border border-line-2 bg-bg-3 px-3 py-1.5 text-sm text-ink-0 placeholder-ink-3 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="rounded-[7px] border border-line-2 bg-bg-3 px-3 py-1.5 text-sm text-ink-0 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="all">All modes</option>
            {uniqueModes.map(mode => (
              <option key={mode} value={mode}>{titleCase(mode)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-ink-2">
          <thead className="border-b border-line-2 bg-bg-3/60 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            <tr>
              <th scope="col" className="px-4 py-3">Date</th>
              <th scope="col" className="px-4 py-3">Mode & Title</th>
              <th scope="col" className="px-4 py-3">Score</th>
              <th scope="col" className="px-4 py-3">Duration</th>
              <th scope="col" className="px-4 py-3">WPM</th>
              <th scope="col" className="px-4 py-3">Camera</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.length > 0 ? (
              filteredSessions.map((session) => (
                <tr key={session.id} className="border-b border-line-1 hover:bg-bg-3">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 font-mono text-[12px] tabular-nums">
                      <Calendar className="h-4 w-4 text-ink-3" />
                      {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-0">
                    <div>{titleCase(session.mode)}</div>
                    {session.title && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-3 font-normal">
                        {session.title.startsWith("[Demo]") ? (
                          <>
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                              Demo
                            </span>
                            <span>{session.title.replace("[Demo]", "").trim()}</span>
                          </>
                        ) : (
                          session.title
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {session.overallScore !== null ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium ${
                          session.overallScore >= 80
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                            : session.overallScore >= 60
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                            : 'border-red-500/40 bg-red-500/10 text-red-400'
                        }`}
                      >
                        {session.overallScore}
                      </span>
                    ) : (
                      "--"
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-mono text-[12px] tabular-nums">
                      <Clock className="h-4 w-4 text-ink-3" />
                      {Math.floor(session.durationSeconds / 60)}:{(session.durationSeconds % 60).toString().padStart(2, '0')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-mono text-[12px] tabular-nums">
                      <MessageSquare className="h-4 w-4 text-ink-3" />
                      {session.wordsPerMinute ?? "--"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-mono text-[12px] tabular-nums">
                      <Camera className="h-4 w-4 text-ink-3" />
                      {session.cameraFacingScore !== null ? `${session.cameraFacingScore}%` : "--"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onSelect(session.id)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                      >
                        View <ChevronRight className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onDelete(session.id)}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                        title="Delete session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-3">
                  No sessions found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

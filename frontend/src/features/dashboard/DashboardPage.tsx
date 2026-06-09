import { useEffect, useState } from "react";
import { UserRound, Loader2, AlertCircle, ServerCrash, ServerOff, RefreshCw } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { useAppStore } from "../../app/store";
import { getUserDisplayName } from "../../lib/utils";
import { useSessionPersistence } from "../../hooks/useSessionPersistence";
import { useSessionAnalytics } from "../../hooks/useSessionAnalytics";
import { DashboardSummaryCards } from "../../components/dashboard/DashboardSummaryCards";
import { ScoreTrendChart } from "../../components/dashboard/ScoreTrendChart";
import { SessionHistoryTable } from "../../components/dashboard/SessionHistoryTable";
import { SessionDetailPanel } from "../../components/dashboard/SessionDetailPanel";
import { EmptyDashboardState } from "../../components/dashboard/EmptyDashboardState";
import { demoDashboardSessions } from "../../lib/demoData";
import { getDiagnostics, type DiagnosticsResponse } from "../../lib/api";

export function DashboardPage() {
  const user = useAppStore((state) => state.user);
  const session = useAppStore((state) => state.session);
  const isDemoMode = useAppStore((state) => state.isDemoMode);

  const {
    savedSessions: rawSavedSessions,
    loadSessions,
    loadStatus,
    error,
    errorCode,
    selectedSession,
    loadSession,
    deleteSession,
  } = useSessionPersistence();

  const [diagnostics, setDiagnostics] = useState<DiagnosticsResponse | null>(null);

  useEffect(() => {
    if (errorCode === "service_unavailable" || errorCode === "server_error") {
      let cancelled = false;
      getDiagnostics().then((result) => {
        if (!cancelled && result.data) {
          setDiagnostics(result.data);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    setDiagnostics(null);
    return undefined;
  }, [errorCode]);

  const savedSessions = isDemoMode
    ? [...demoDashboardSessions, ...rawSavedSessions]
    : rawSavedSessions;

  const analytics = useSessionAnalytics(savedSessions);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.access_token) {
      loadSessions();
    }
  }, [session?.access_token, loadSessions]);

  const handleSelectSession = async (id: string) => {
    await loadSession(id);
  };

  const handleClosePanel = () => {
    // We can't directly unset selectedSession in the hook easily without modifying it, 
    // but we can just use a local state if needed. Or we just leave it and hide the panel.
    // Let's add a clearSelectedSession to the hook or just handle it here with local state for visibility.
    setPanelOpen(false);
  };

  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (selectedSession) {
      setPanelOpen(true);
    }
  }, [selectedSession]);

  const handleDeleteSession = async (id: string) => {
    if (confirm("Are you sure you want to delete this session?")) {
      setIsDeletingId(id);
      await deleteSession(id);
      setIsDeletingId(null);
      if (selectedSession?.id === id) {
        setPanelOpen(false);
      }
    }
  };

  return (
    <section className="space-y-6 relative">
      <div>
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-300">Dashboard</p>
        <h1 className="mt-2 text-[32px] font-medium tracking-[-0.022em] text-ink-0">Practice command center</h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-[1.6] text-ink-2">
          Track sessions, scores, and progress.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink-0">
                {getUserDisplayName(user)}
              </p>
              <p className="text-sm text-ink-3">{user?.email ?? "Signed in"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {loadStatus === "loading" && (
              <span className="flex items-center gap-2 text-sm text-cyan-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing
              </span>
            )}
            <p className="text-sm text-ink-3">
              Session status:{" "}
              <span className="font-medium text-cyan-300">
                {session ? "active" : "missing"}
              </span>
            </p>
          </div>
        </div>
      </Card>

      {error && errorCode === "network_offline" && (
        <Card className="border border-amber-500/30 bg-amber-500/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <ServerOff className="h-5 w-5 text-amber-300 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-amber-100">
                  Backend is unavailable. Please start the backend server.
                </p>
                <p className="mt-1 text-xs text-amber-200/80">
                  Run the FastAPI server from <code className="rounded bg-zinc-900/60 px-1 py-0.5">backend/</code>{" "}
                  (e.g. <code className="rounded bg-zinc-900/60 px-1 py-0.5">uvicorn app.main:app --reload</code>) then retry.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadSessions()}
              className="inline-flex h-9 items-center gap-2 self-start rounded-md border border-amber-400/40 bg-amber-400/10 px-3 text-xs font-semibold text-amber-100 hover:bg-amber-400/20 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </button>
          </div>
        </Card>
      )}

      {error && errorCode === "service_unavailable" && (
        <Card className="border border-orange-500/30 bg-orange-500/10">
          <div className="flex items-start gap-3">
            <ServerCrash className="h-5 w-5 text-orange-300 mt-0.5" aria-hidden="true" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-orange-100">
                Saved sessions can&apos;t load yet: backend database is not fully configured.
              </p>
              <p className="text-xs text-orange-200/80">{error}</p>
              {diagnostics && (
                <dl className="mt-2 grid grid-cols-1 gap-1 text-xs text-orange-100/80 sm:grid-cols-2">
                  <div><dt className="inline font-semibold">Database:</dt> <dd className="inline">{diagnostics.database}</dd></div>
                  <div><dt className="inline font-semibold">Environment:</dt> <dd className="inline">{diagnostics.environment}</dd></div>
                  <div><dt className="inline font-semibold">API:</dt> <dd className="inline">{diagnostics.api}</dd></div>
                  <div><dt className="inline font-semibold">Auth:</dt> <dd className="inline">{diagnostics.auth}</dd></div>
                </dl>
              )}
              <p className="text-xs text-orange-200/70">
                Set <code className="rounded bg-zinc-900/60 px-1 py-0.5">SUPABASE_URL</code> and{" "}
                <code className="rounded bg-zinc-900/60 px-1 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
                <code className="rounded bg-zinc-900/60 px-1 py-0.5">backend/.env</code> and restart the backend.
              </p>
            </div>
          </div>
        </Card>
      )}

      {error &&
        errorCode !== "network_offline" &&
        errorCode !== "service_unavailable" && (
        <div className="rounded-md bg-red-500/10 p-4 border border-red-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}

      {error && savedSessions.length === 0 ? null : loadStatus === "loaded" && savedSessions.length === 0 && !error ? (
        <EmptyDashboardState />
      ) : (
        <>
          <DashboardSummaryCards analytics={analytics} />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <ScoreTrendChart data={analytics.scoreTrend} />
            </div>
            <div className="space-y-6">
              {/* Optional: Add a mode breakdown or other small widget here */}
              <Card className="h-full">
                 <h3 className="text-[15px] font-medium text-ink-0 mb-4">Practice modes</h3>
                 <div className="space-y-3">
                   {Object.entries(analytics.modeCounts).map(([mode, count]) => (
                     <div key={mode} className="flex items-center justify-between">
                       <span className="text-[13px] text-ink-2 capitalize">{mode.replace('_', ' ')}</span>
                       <span className="font-mono text-[13px] font-medium text-ink-0 tabular-nums">{count}</span>
                     </div>
                   ))}
                   {Object.keys(analytics.modeCounts).length === 0 && (
                     <p className="text-[13px] text-ink-3">No data available.</p>
                   )}
                 </div>
              </Card>
            </div>
          </div>

          <SessionHistoryTable 
            sessions={savedSessions} 
            onSelect={handleSelectSession} 
            onDelete={handleDeleteSession}
            isDeleting={isDeletingId !== null}
          />
        </>
      )}

      {panelOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={handleClosePanel}
          />
          <SessionDetailPanel 
            session={selectedSession} 
            onClose={handleClosePanel} 
          />
        </>
      )}
    </section>
  );
}

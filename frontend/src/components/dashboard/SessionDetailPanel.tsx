import { X, Clock, MessageSquare, Camera, Activity, FileText, CheckCircle2, AlertTriangle, Target, MessageSquareText } from "lucide-react";
import type { SavedPracticeSessionDetail } from "../../lib/api";
import { Card } from "../ui/Card";
import { titleCase } from "../../lib/utils";

export type SessionDetailPanelProps = {
  session: SavedPracticeSessionDetail | null;
  onClose: () => void;
};

export function SessionDetailPanel({ session, onClose }: SessionDetailPanelProps) {
  if (!session) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-bg-1 border-l border-line-2 shadow-2xl overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line-2 bg-bg-1/80 px-6 py-4 backdrop-blur-md">
        <div>
          <h2 className="text-[18px] font-medium text-ink-0">
            {titleCase(session.mode)} session
          </h2>
          <p className="text-[12px] text-ink-3">
            {new Date(session.createdAt).toLocaleString()}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-2 text-ink-2 hover:bg-bg-3 hover:text-ink-0 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Practiced question (RAG-3) */}
        <PracticedQuestionCard session={session} />

        {/* Top metrics summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 flex flex-col items-center justify-center text-center">
            <div className="text-zinc-400 text-xs uppercase font-medium tracking-wider mb-1">Score</div>
            <div className={`font-mono text-[26px] font-medium tabular-nums ${session.overallScore && session.overallScore >= 80 ? 'text-emerald-400' : session.overallScore && session.overallScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
              {session.overallScore ?? "--"}
            </div>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center text-center">
            <div className="text-zinc-400 text-xs uppercase font-medium tracking-wider mb-1">Duration</div>
            <div className="text-xl font-semibold text-white flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-zinc-500" />
              {Math.floor(session.durationSeconds / 60)}:{(session.durationSeconds % 60).toString().padStart(2, '0')}
            </div>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center text-center">
            <div className="text-zinc-400 text-xs uppercase font-medium tracking-wider mb-1">WPM</div>
            <div className="text-xl font-semibold text-white flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-zinc-500" />
              {session.wordsPerMinute ?? "--"}
            </div>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center text-center">
            <div className="text-zinc-400 text-xs uppercase font-medium tracking-wider mb-1">Camera</div>
            <div className="text-xl font-semibold text-white flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-zinc-500" />
              {session.cameraFacingScore !== null ? `${session.cameraFacingScore}%` : "--"}
            </div>
          </Card>
        </div>

        {/* Score Breakdown (if available) */}
        {session.scoreSnapshot && Object.keys(session.scoreSnapshot).length > 0 && (
          <Card>
            <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-300" />
              Score Breakdown
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500">Clarity</span>
                <span className="text-lg font-medium text-white">{session.clarityScore ?? "--"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500">Pace</span>
                <span className="text-lg font-medium text-white">{session.paceScore ?? "--"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500">Delivery</span>
                <span className="text-lg font-medium text-white">{session.deliveryScore ?? "--"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500">Engagement</span>
                <span className="text-lg font-medium text-white">{session.engagementScore ?? "--"}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Coaching Report Summary */}
        {session.coachingReport && typeof session.coachingReport === 'object' && (
          <Card className="space-y-4">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-300" />
              Coaching Report
            </h3>
            
            {(session.coachingReport as any).summary && (
              <p className="text-sm text-zinc-300 leading-relaxed">
                {(session.coachingReport as any).summary}
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              {/* Strengths */}
              {Array.isArray((session.coachingReport as any).strengths) && (session.coachingReport as any).strengths.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
                  </h4>
                  <ul className="space-y-1.5">
                    {(session.coachingReport as any).strengths.map((strength: string, i: number) => (
                      <li key={i} className="text-sm text-ink-2 flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">•</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvement Areas */}
              {Array.isArray((session.coachingReport as any).improvementAreas) && (session.coachingReport as any).improvementAreas.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Areas to improve
                  </h4>
                  <ul className="space-y-1.5">
                    {(session.coachingReport as any).improvementAreas.map((area: string, i: number) => (
                      <li key={i} className="text-sm text-ink-2 flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Rewritten Answer */}
            {(session.coachingReport as any).rewrittenAnswer && (
              <div className="mt-4 pt-4 border-t border-line-1">
                <h4 className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cyan-300 mb-2">Suggested rewrite</h4>
                <div className="bg-bg-2 p-3 rounded-md text-sm text-ink-1 font-serif italic border-l-[3px] border-cyan-400">
                  {(session.coachingReport as any).rewrittenAnswer}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Transcript Preview */}
        <Card>
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-300" />
            Transcript
          </h3>
          <div className="rounded-md bg-zinc-900/50 p-4 max-h-60 overflow-y-auto text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {session.transcript.fullTranscript || <span className="text-zinc-500 italic">No transcript recorded.</span>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function PracticedQuestionCard({ session }: { session: SavedPracticeSessionDetail }) {
  const promptText = session.selectedPromptText?.trim();
  if (!promptText) return null;

  const metadata = (session.selectedPromptMetadata ?? {}) as {
    category?: string;
    difficulty?: string;
    questionSource?: string;
    resumeLabel?: string;
    groundedIn?: string[];
    suggestedAnswerAngle?: string | null;
  };
  const sourceLabel =
    session.selectedPromptSource === "resume_question"
      ? "from resume"
      : session.selectedPromptSource ?? "manual";
  const groundedReferences = Array.isArray(metadata.groundedIn)
    ? metadata.groundedIn.filter((entry): entry is string => Boolean(entry))
    : [];

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-medium text-white flex items-center gap-2">
        <MessageSquareText className="h-4 w-4 text-cyan-300" />
        Practiced question
      </h3>
      <p className="text-sm text-zinc-200 leading-relaxed">{promptText}</p>
      <div className="flex flex-wrap gap-2 text-[11px] font-mono uppercase tracking-[0.14em]">
        <span className="rounded-full border border-cyan-400/30 bg-cyan-500/[0.08] px-2 py-0.5 text-cyan-300">
          {sourceLabel}
        </span>
        {metadata.category && (
          <span className="rounded-full border border-line-2 bg-bg-3 px-2 py-0.5 text-ink-2">
            {metadata.category}
          </span>
        )}
        {metadata.difficulty && (
          <span className="rounded-full border border-line-2 bg-bg-3 px-2 py-0.5 text-ink-2">
            {metadata.difficulty}
          </span>
        )}
        {metadata.questionSource && (
          <span className="rounded-full border border-line-2 bg-bg-3 px-2 py-0.5 text-ink-2">
            {metadata.questionSource === "resume" ? "resume-grounded" : metadata.questionSource}
          </span>
        )}
        {metadata.resumeLabel && (
          <span className="rounded-full border border-line-2 bg-bg-3 px-2 py-0.5 text-ink-2">
            {metadata.resumeLabel}
          </span>
        )}
      </div>
      {groundedReferences.length > 0 && (
        <div className="rounded-md border border-line-1 bg-bg-2 px-3 py-2">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            Resume-grounded references
          </p>
          <ul className="mt-1 space-y-1">
            {groundedReferences.map((reference, index) => (
              <li key={`grounded-${index}`} className="text-xs leading-5 text-ink-2">
                {reference}
              </li>
            ))}
          </ul>
        </div>
      )}
      {metadata.suggestedAnswerAngle && (
        <p className="text-xs leading-5 text-ink-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            Answer angle
          </span>
          {" — "}
          {metadata.suggestedAnswerAngle}
        </p>
      )}
    </Card>
  );
}

import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Lightbulb,
  ListChecks,
  MessageSquareQuote,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import type { CoachingReportOutput } from "../../lib/api";
import type { CoachingReportStatus } from "../../hooks/useCoachingReport";
import { StatusBadge } from "../ui/StatusBadge";
import { CoachingReportCard } from "./CoachingReportCard";
import { RewrittenAnswerCard } from "./RewrittenAnswerCard";
import { ReportActions } from "./ReportActions";
import { TranscriptHighlights } from "./TranscriptHighlights";

type CoachingReportPanelProps = {
  status: CoachingReportStatus;
  report: CoachingReportOutput | null;
  error: string | null;
  canGenerate: boolean;
  readinessMessage: string;
  onGenerate: () => void;
  onClear: () => void;
};

export function CoachingReportPanel({
  status,
  report,
  error,
  canGenerate,
  readinessMessage,
  onGenerate,
  onClear,
}: CoachingReportPanelProps) {
  const hasReport = Boolean(report);

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800 bg-zinc-950/72 p-5 shadow-panel"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/20">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                AI coaching report
              </h2>
              {report ? (
                <>
                  <StatusBadge label={`${report.confidenceLabel} confidence`} tone="cyan" />
                  {report.provider === "mock" && (
                    <StatusBadge label="Sample" tone="amber" />
                  )}
                </>
              ) : (
                <StatusBadge
                  label={status === "generating" ? "generating" : "ready on request"}
                  tone={canGenerate ? "online" : "pending"}
                />
              )}
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Generated only when you click. Uses your transcript and live
              metrics to provide coaching feedback.
            </p>
            {report && (
              <p className="mt-1 text-[11px] text-zinc-600">
                {formatGenerated(report.generatedAt)} / {report.mode.replace("_", " ")}
              </p>
            )}
          </div>
        </div>

        <ReportActions
          canGenerate={canGenerate}
          hasReport={hasReport}
          onClear={onClear}
          onGenerate={onGenerate}
          status={status}
        />
      </div>

      {!report && (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/45 p-4">
          <p className="text-sm leading-6 text-zinc-300">{readinessMessage}</p>
          {!canGenerate && (
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Speak for a bit more and let the score update before generating
              a report.
            </p>
          )}
        </div>
      )}

      {status === "generating" && (
        <div className="mt-4 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">
          Building a structured coaching report...
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-400/25 bg-rose-400/5 p-4 text-sm text-rose-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {report && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-white">Assessment</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-200">{report.summary}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {report.overallAssessment}
              </p>
            </div>

            <ScoreSummaryGrid report={report} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <CoachingReportCard
              accent="emerald"
              icon={<CheckCircle2 className="h-4 w-4" />}
              items={report.strengths}
              title="Strengths"
            />
            <CoachingReportCard
              accent="amber"
              icon={<Lightbulb className="h-4 w-4" />}
              items={report.improvementAreas}
              title="Improvement areas"
            />
            <CoachingReportCard
              accent="cyan"
              icon={<Target className="h-4 w-4" />}
              items={report.nextPracticeFocus}
              title="Next practice focus"
            />
          </div>

          <RewrittenAnswerCard rewrittenAnswer={report.rewrittenAnswer} />

          <CoachingReportCard
            icon={<MessageSquareQuote className="h-4 w-4" />}
            title="Transcript highlights"
          >
            <TranscriptHighlights highlights={report.transcriptHighlights} />
          </CoachingReportCard>

          <div className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900/45 p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
            <p className="text-xs leading-5 text-zinc-500">{report.safetyNote}</p>
          </div>
        </div>
      )}
    </motion.section>
  );
}

function ScoreSummaryGrid({ report }: { report: CoachingReportOutput }) {
  const score = report.scoreSummary;
  const rows = [
    ["Overall", score.overallScore],
    ["Clarity", score.clarity],
    ["Pace", score.pace],
    ["Delivery", score.delivery],
    ["Engagement", score.engagement],
    ["Camera-facing", score.cameraFacing],
  ] as const;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-cyan-300" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white">Score summary</h3>
        </div>
        <span className="text-xs font-medium text-zinc-400">{score.label}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div
            className="rounded-lg border border-zinc-800 bg-zinc-950/55 px-3 py-2"
            key={label}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {label}
            </p>
            <p className="mt-1 text-lg font-semibold text-zinc-100">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-500">
        Score breakdown reflects your session metrics.
      </p>
    </div>
  );
}

function formatGenerated(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Generated just now";
  return `Generated ${parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

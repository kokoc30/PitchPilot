import { useState, type ReactNode } from "react";
import { Loader2, Sparkles, Wand2, ChevronDown, ChevronUp } from "lucide-react";
import { useAppStore } from "../../app/store";
import { useResumeQuestionHistory } from "../../hooks/useResumeQuestionHistory";
import {
  RESUME_DIFFICULTIES,
  RESUME_INTERVIEW_TYPES,
  useResumeQuestions,
} from "../../hooks/useResumeQuestions";
import type {
  ResumeDocumentDetail,
  ResumeInterviewType,
  ResumeQuestion,
  ResumeQuestionDifficulty,
} from "../../lib/api";
import { sanitizeSelectedPrompt } from "../../lib/promptContext";
import { Button } from "../ui/Button";
import { ResumeInterviewSteps } from "./ResumeInterviewSteps";
import {
  ResumeQuestionHistoryPanel,
  QuestionRow,
  type ResumeQuestionTab,
} from "./ResumeQuestionHistoryPanel";

type ResumeQuestionPanelProps = {
  resume: ResumeDocumentDetail | null;
  isPracticeActive?: boolean;
  questions: ReturnType<typeof useResumeQuestions>;
  history: ReturnType<typeof useResumeQuestionHistory>;
  generatedQuestions: ResumeQuestion[];
  currentQuestionIndex: number;
  targetRole: string;
  setTargetRole: (role: string) => void;
  interviewType: ResumeInterviewType;
  setInterviewType: (type: ResumeInterviewType) => void;
  difficulty: ResumeQuestionDifficulty;
  setDifficulty: (difficulty: ResumeQuestionDifficulty) => void;
  count: number;
  setCount: (count: number) => void;
  focus: string;
  setFocus: (focus: string) => void;
  handlePractice: (question: ResumeQuestion) => void;
  handleGenerate: () => Promise<void>;
};

const INTERVIEW_TYPE_LABELS: Record<ResumeInterviewType, string> = {
  general: "General",
  behavioral: "Behavioral",
  technical: "Technical",
  project: "Project deep-dive",
  startup: "Startup",
};

export function ResumeQuestionPanel({
  resume,
  isPracticeActive = false,
  questions,
  history,
  generatedQuestions,
  currentQuestionIndex,
  targetRole,
  setTargetRole,
  interviewType,
  setInterviewType,
  difficulty,
  setDifficulty,
  count,
  setCount,
  focus,
  setFocus,
  handlePractice,
  handleGenerate,
}: ResumeQuestionPanelProps) {
  const selectedPrompt = useAppStore((state) => state.selectedPrompt);
  const [activeTab, setActiveTab] = useState<ResumeQuestionTab>("saved");
  const [showHistory, setShowHistory] = useState(false);

  const resumeHasChunks = Boolean(resume && resume.chunkCount > 0);
  const disabled = !resumeHasChunks || questions.status === "generating";
  const hasQuestions = generatedQuestions.length > 0 || history.questions.length > 0;

  const onGenerateClick = async () => {
    await handleGenerate();
    setActiveTab("generated");
  };

  const handleToggleFavorite = (question: ResumeQuestion) => {
    if (!resume || !question.isPersisted) return;
    void history.toggleFavorite(resume.id, question);
  };

  const handleDelete = (question: ResumeQuestion) => {
    if (!resume || !question.isPersisted) return;
    void history.deleteQuestion(resume.id, question.id);
  };

  // providerLabel is intentionally not shown in the main UI to avoid
  // exposing internal provider/fallback details to users.

  return (
    <div id="interview-questions-section" className="space-y-4">
      <ResumeInterviewSteps
        hasQuestions={hasQuestions}
        hasResume={Boolean(resume)}
        hasSelectedQuestion={Boolean(selectedPrompt?.text)}
        isPracticeActive={isPracticeActive}
      />

      <section className="rounded-md border border-line-2 bg-bg-2 p-5 shadow-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-500/12 text-cyan-300 ring-1 ring-cyan-400/20">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold text-ink-0">
                  Interview questions
                </h2>
              </div>
              <p className="mt-1 max-w-2xl text-[12.5px] leading-5 text-ink-2">
                Generate focused questions, save useful prompts, and choose one to practice.
              </p>
              <p className="mt-0.5 text-[11px] text-ink-3">
                Questions are based on your resume.
              </p>
            </div>
          </div>
        </div>

        {!resume && (
          <div className="mt-5 rounded-md border border-line-1 bg-bg-1 p-4 text-sm text-ink-3">
            Upload or select a resume to generate personalized questions.
          </div>
        )}

        {resume && (
          <>
            {!resumeHasChunks && (
              <div className="mt-5 rounded-md border border-amber-500/25 bg-amber-500/[0.06] p-4 text-sm text-amber-100">
                This resume has no searchable chunks. Re-upload a resume with selectable text before generating questions.
              </div>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Field label="Target role">
                <input
                  className="h-9 w-full rounded-md border border-line-2 bg-bg-1 px-3 text-sm text-ink-0 placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  disabled={disabled}
                  onChange={(event) => setTargetRole(event.target.value)}
                  placeholder="Founding ML engineer"
                  value={targetRole}
                />
              </Field>
              <Field label="Interview type">
                <select
                  className="h-9 w-full rounded-md border border-line-2 bg-bg-1 px-2 text-sm text-ink-0 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  disabled={disabled}
                  onChange={(event) =>
                    setInterviewType(event.target.value as ResumeInterviewType)
                  }
                  value={interviewType}
                >
                  {RESUME_INTERVIEW_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {INTERVIEW_TYPE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Difficulty">
                <select
                  className="h-9 w-full rounded-md border border-line-2 bg-bg-1 px-2 text-sm text-ink-0 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  disabled={disabled}
                  onChange={(event) =>
                    setDifficulty(event.target.value as ResumeQuestionDifficulty)
                  }
                  value={difficulty}
                >
                  {RESUME_DIFFICULTIES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Count">
                <input
                  className="h-9 w-full rounded-md border border-line-2 bg-bg-1 px-3 text-sm text-ink-0 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  disabled={disabled}
                  max={12}
                  min={1}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isNaN(next)) return;
                    setCount(Math.min(Math.max(Math.round(next), 1), 12));
                  }}
                  type="number"
                  value={count}
                />
              </Field>
              <Field label="Focus">
                <input
                  className="h-9 w-full rounded-md border border-line-2 bg-bg-1 px-3 text-sm text-ink-0 placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  disabled={disabled}
                  onChange={(event) => setFocus(event.target.value)}
                  placeholder="Leadership, data infra"
                  value={focus}
                />
              </Field>
            </div>

            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  disabled={disabled}
                  icon={
                    questions.status === "generating" ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Wand2 className="h-4 w-4" aria-hidden="true" />
                    )
                  }
                  onClick={() => void onGenerateClick()}
                  size="sm"
                >
                  {questions.status === "generating"
                    ? "Generating"
                    : "Generate questions"}
                </Button>
              </div>

              {/* Status Line */}
              {questions.status === "ready" && generatedQuestions.length > 0 && (
                <p className="mt-2.5 text-xs font-medium text-cyan-300">
                  {generatedQuestions.length} questions ready
                </p>
              )}
            </div>

            <div className="mt-6 border-t border-line-2 pt-5">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-[13px] font-semibold text-ink-1 hover:text-cyan-400 transition focus:outline-none"
              >
                {showHistory ? (
                  <ChevronUp className="h-4 w-4 text-cyan-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-cyan-400" />
                )}
                Question history ({history.questions.length} saved)
              </button>

              {showHistory && (
                <ResumeQuestionHistoryPanel
                  activeTab={activeTab}
                  generatedQuestions={generatedQuestions}
                  generationError={questions.error}
                  historyError={history.error}
                  historyLoading={history.status === "loading"}
                  isGenerating={questions.status === "generating"}
                  onActiveTabChange={setActiveTab}
                  onClearGenerated={questions.reset}
                  onDelete={handleDelete}
                  onPractice={handlePractice}
                  onRegenerate={() => void onGenerateClick()}
                  onToggleFavorite={handleToggleFavorite}
                  savedQuestions={history.questions}
                  selectedQuestionId={selectedPrompt?.questionId}
                  warnings={questions.warnings}
                />
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
        {label}
      </span>
      {children}
    </label>
  );
}

import { motion } from "framer-motion";
import {
  Lightbulb,
  MessageSquareText,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { SelectedPracticePrompt } from "../../app/store";
import type { ResumeQuestion } from "../../lib/api";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";

type CurrentQuestionPanelProps = {
  selectedPrompt: SelectedPracticePrompt | null;
  onClearQuestion: () => void;
  isPracticeActive: boolean;
  hasResume: boolean;
  generatedQuestions?: ResumeQuestion[];
  currentQuestionIndex?: number;
  onNextQuestion?: () => void;
  onPreviousQuestion?: () => void;
  onRegenerate?: () => void;
  isQuestionQueueEnded?: boolean;
  onEndQueue?: () => void;
};

export function CurrentQuestionPanel({
  selectedPrompt,
  onClearQuestion,
  isPracticeActive,
  hasResume,
  generatedQuestions = [],
  currentQuestionIndex = -1,
  onNextQuestion,
  onPreviousQuestion,
  onRegenerate,
  isQuestionQueueEnded = false,
  onEndQueue,
}: CurrentQuestionPanelProps) {
  
  const handleScrollToQuestions = () => {
    const el = document.getElementById("interview-questions-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const isAtEnd = generatedQuestions.length > 0 && currentQuestionIndex >= generatedQuestions.length;

  // Render the queue-ended completed screen first
  if (isQuestionQueueEnded) {
    return (
      <motion.aside
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center text-center p-8 rounded-xl border border-zinc-800 bg-zinc-950/72 shadow-panel min-h-[340px]"
        initial={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 mb-4 ring-1 ring-cyan-400/25">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="mb-2">
          <StatusBadge label="Ended" tone="amber" />
        </div>
        <h3 className="text-base font-semibold text-white">Interview queue ended</h3>
        <p className="mt-2 text-sm text-zinc-400 max-w-[280px] leading-relaxed">
          You can generate a report, save this session, or start a new question set.
        </p>
        <div className="flex flex-col gap-2 mt-6 w-full max-w-[220px]">
          {onRegenerate && (
            <Button variant="primary" size="sm" onClick={onRegenerate}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate Questions
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClearQuestion}>
            Clear Question
          </Button>
        </div>
      </motion.aside>
    );
  }

  if (!selectedPrompt) {
    if (isAtEnd) {
      return (
        <motion.aside
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center text-center p-8 rounded-xl border border-zinc-800 bg-zinc-950/72 shadow-panel min-h-[340px]"
          initial={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 mb-4 ring-1 ring-cyan-400/25">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-white">No more questions</h3>
          <p className="mt-2 text-sm text-zinc-400 max-w-[280px] leading-relaxed">
            You have gone through all generated questions.
          </p>
          <div className="flex flex-col gap-2 mt-6 w-full max-w-[220px]">
            {onRegenerate && (
              <Button variant="primary" size="sm" onClick={onRegenerate}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate Questions
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleScrollToQuestions}>
              Question History
            </Button>
          </div>
        </motion.aside>
      );
    }

    return (
      <motion.aside
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center text-center p-8 rounded-xl border border-zinc-800 bg-zinc-950/72 shadow-panel min-h-[340px]"
        initial={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 mb-4 ring-1 ring-cyan-400/25 animate-pulse">
          <MessageSquareText className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-white">No active question</h3>
        <p className="mt-2 text-sm text-zinc-400 max-w-[280px] leading-relaxed">
          Choose or generate a question to guide your answer.
        </p>
        <div className="flex flex-col gap-2 mt-6 w-full max-w-[220px]">
          <Button variant="primary" size="sm" onClick={handleScrollToQuestions}>
            Choose Question
          </Button>
          {hasResume && (
            <Button variant="ghost" size="sm" onClick={handleScrollToQuestions}>
              Generate Questions
            </Button>
          )}
        </div>
      </motion.aside>
    );
  }

  // Determine source label and tone
  let sourceLabel = "Custom";
  let sourceTone: "cyan" | "muted" | "amber" = "muted";
  if (selectedPrompt.source === "resume_question" || selectedPrompt.questionSource === "resume") {
    sourceLabel = "Resume";
    sourceTone = "cyan";
  } else if (selectedPrompt.questionSource === "general") {
    sourceLabel = "General";
    sourceTone = "muted";
  } else if (selectedPrompt.questionSource === "mock") {
    sourceLabel = "Sample";
    sourceTone = "amber";
  }

  const groundedReferences = (selectedPrompt.groundedIn ?? []).slice(0, 2);
  const isQueueQuestion = generatedQuestions.length > 0 && currentQuestionIndex >= 0 && currentQuestionIndex < generatedQuestions.length;

  return (
    <motion.aside
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/72 p-5 shadow-panel min-h-[340px]"
      initial={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="space-y-4">
        {/* Header and Badges */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-800/60 pb-3">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.16em] text-zinc-400 mr-1">
            {isQueueQuestion
              ? `Question ${currentQuestionIndex + 1} of ${generatedQuestions.length}`
              : "Prompt"}
          </span>
          <StatusBadge label={sourceLabel} tone={sourceTone} />
          {selectedPrompt.category && (
            <StatusBadge label={selectedPrompt.category} tone="muted" />
          )}
          {selectedPrompt.difficulty && (
            <StatusBadge
              label={selectedPrompt.difficulty}
              tone={
                selectedPrompt.difficulty === "hard"
                  ? "amber"
                  : selectedPrompt.difficulty === "easy"
                    ? "muted"
                    : "cyan"
              }
            />
          )}
        </div>

        {/* Question Text (Large and readable) */}
        <div className="py-1">
          <p className="text-base font-semibold leading-relaxed text-white md:text-[17px]">
            {selectedPrompt.text}
          </p>
        </div>

        {/* Answer Angle if available */}
        {selectedPrompt.suggestedAnswerAngle && (
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/35 p-3">
            <span className="inline-flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              <Sparkles className="h-3 w-3 text-cyan-400" aria-hidden="true" />
              Suggested Angle
            </span>
            <p className="mt-1 text-xs leading-relaxed text-zinc-300">
              {selectedPrompt.suggestedAnswerAngle}
            </p>
          </div>
        )}

        {/* Grounded References if available */}
        {groundedReferences.length > 0 && (
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/35 p-3">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Resume Context
            </span>
            <ul className="mt-1.5 space-y-1 text-xs text-zinc-300 list-disc list-inside">
              {groundedReferences.map((reference, index) => (
                <li key={`grounded-${index}`} className="leading-relaxed">
                  {reference}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-4 pt-3 border-t border-zinc-800/60 mt-2">
        {/* Looking at camera helper */}
        <div className="flex items-start gap-2 rounded-lg bg-cyan-500/[0.04] border border-cyan-500/10 p-2.5 text-xs text-cyan-200">
          <Lightbulb className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" aria-hidden="true" />
          <span className="leading-relaxed">
            Answer naturally while looking toward the camera.
          </span>
        </div>

        {/* Navigation & Actions */}
        <div className="flex flex-col gap-3">
          {isQueueQuestion && (
            <div className="flex flex-wrap items-center gap-2">
              {currentQuestionIndex > 0 && onPreviousQuestion && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPreviousQuestion}
                  icon={<ChevronLeft className="h-4 w-4" />}
                  className="w-full sm:w-auto"
                >
                  Previous
                </Button>
              )}
              
              {onNextQuestion && (
                currentQuestionIndex < generatedQuestions.length - 1 ? (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onNextQuestion}
                      className="w-full sm:w-auto"
                    >
                      Next Question <ChevronRight className="h-4 w-4 ml-1 inline" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onNextQuestion}
                      className="flex-1 sm:flex-none"
                    >
                      Skip
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onNextQuestion}
                    className="w-full sm:w-auto"
                  >
                    Finish Queue <CheckCircle2 className="h-4 w-4 ml-1 inline" />
                  </Button>
                )
              )}

              {onEndQueue && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEndQueue}
                  className="flex-1 sm:flex-none border border-white/10 hover:border-red-500/30 text-rose-300/90 hover:text-red-400"
                  icon={<XCircle className="h-4 w-4" />}
                  aria-label="End question queue"
                >
                  End
                </Button>
              )}
              
              {onRegenerate && (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={onRegenerate}
                  icon={<RefreshCw className="h-3.5 w-3.5" />}
                  title="Regenerate all questions"
                  className="flex-1 sm:flex-none"
                >
                  Regenerate
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/40 pt-2">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleScrollToQuestions}>
                Change Prompt
              </Button>
              {hasResume && !isQueueQuestion && onRegenerate && (
                <Button variant="ghost" size="sm" onClick={onRegenerate}>
                  Generate Queue
                </Button>
              )}
            </div>
            <Button
              disabled={isPracticeActive}
              icon={<X className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={onClearQuestion}
              size="sm"
              variant="quiet"
              title={
                isPracticeActive
                  ? "Pause the session before clearing the prompt"
                  : "Clear the selected prompt"
              }
            >
              Clear question
            </Button>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

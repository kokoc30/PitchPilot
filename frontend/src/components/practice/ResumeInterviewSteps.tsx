import { Check, FileText, MessageSquareText, Mic, Wand2 } from "lucide-react";
import { cn } from "../../lib/utils";

type ResumeInterviewStepsProps = {
  hasResume: boolean;
  hasQuestions: boolean;
  hasSelectedQuestion: boolean;
  isPracticeActive: boolean;
};

const steps = [
  { label: "Upload/select resume", icon: FileText },
  { label: "Generate questions", icon: Wand2 },
  { label: "Choose question", icon: MessageSquareText },
  { label: "Practice answer", icon: Mic },
];

export function ResumeInterviewSteps({
  hasResume,
  hasQuestions,
  hasSelectedQuestion,
  isPracticeActive,
}: ResumeInterviewStepsProps) {
  const complete = [hasResume, hasQuestions, hasSelectedQuestion, isPracticeActive];
  return (
    <section className="rounded-md border border-line-2 bg-bg-2 p-4 shadow-card">
      <div className="grid gap-2 md:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = complete[index] ? Check : step.icon;
          const isDone = complete[index];
          const isCurrent =
            !isDone && (index === 0 || complete.slice(0, index).every(Boolean));
          return (
            <div
              className={cn(
                "flex items-center gap-3 rounded-md border px-3 py-2.5",
                isDone
                  ? "border-cyan-400/30 bg-cyan-500/[0.08]"
                  : isCurrent
                    ? "border-line-3 bg-bg-3"
                    : "border-line-1 bg-bg-1",
              )}
              key={step.label}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  isDone
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "bg-bg-4 text-ink-3",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span
                className={cn(
                  "text-[12.5px] font-medium",
                  isDone || isCurrent ? "text-ink-0" : "text-ink-3",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

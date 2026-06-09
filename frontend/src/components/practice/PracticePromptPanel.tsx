import { Lightbulb, MessageSquareText, X } from "lucide-react";
import { useAppStore } from "../../app/store";
import type { PracticeMode } from "../../app/store";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";

type PracticePromptPanelProps = {
  activeMode: PracticeMode;
  isPracticeActive: boolean;
};

export function PracticePromptPanel({
  activeMode,
  isPracticeActive,
}: PracticePromptPanelProps) {
  const selectedPrompt = useAppStore((state) => state.selectedPrompt);
  const clearSelectedPrompt = useAppStore((state) => state.clearSelectedPrompt);

  if (!selectedPrompt) {
    return <EmptyPromptCard activeMode={activeMode} />;
  }

  const sourceLabel =
    selectedPrompt.source === "resume_question"
      ? "from resume"
      : selectedPrompt.source;
  const sourceTone =
    selectedPrompt.questionSource === "general"
      ? "muted"
      : selectedPrompt.questionSource === "mock"
        ? "amber"
        : "cyan";

  const groundedReferences = selectedPrompt.groundedIn ?? [];

  return (
    <section className="rounded-md border border-cyan-400/30 bg-cyan-500/[0.05] p-5 shadow-card">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/25">
            <MessageSquareText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-semibold text-ink-0">
                Current Practice prompt
              </h2>
              <StatusBadge label={sourceLabel} tone={sourceTone} />
              {selectedPrompt.category && (
                <StatusBadge label={selectedPrompt.category} tone="muted" />
              )}
              {selectedPrompt.difficulty && (
                <StatusBadge label={selectedPrompt.difficulty} tone="cyan" />
              )}
              {selectedPrompt.resumeLabel && (
                <StatusBadge label={selectedPrompt.resumeLabel} tone="muted" />
              )}
            </div>
            <p className="mt-2 text-sm leading-6 text-ink-0">
              {selectedPrompt.text}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-bg-1 px-2 py-1 text-[11px] leading-4 text-ink-2">
              <Lightbulb className="h-3 w-3 text-cyan-300" aria-hidden="true" />
              Answer this question naturally. PitchPilot scores delivery and clarity.
            </p>
          </div>
        </div>
        <Button
          disabled={isPracticeActive}
          icon={<X className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={clearSelectedPrompt}
          size="sm"
          variant="ghost"
          title={
            isPracticeActive
              ? "Pause the session before changing the prompt"
              : "Clear the selected prompt"
          }
        >
          {isPracticeActive ? "Clear after pause" : "Clear prompt"}
        </Button>
      </div>

      {selectedPrompt.suggestedAnswerAngle && (
        <p className="mt-3 rounded-md border border-line-1 bg-bg-1 px-3 py-2 text-xs leading-5 text-ink-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            Answer angle
          </span>
          {" — "}
          {selectedPrompt.suggestedAnswerAngle}
        </p>
      )}

      {groundedReferences.length > 0 && (
        <div className="mt-3 rounded-md border border-line-1 bg-bg-1 px-3 py-2">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            Resume-grounded references
          </p>
          <ul className="mt-1 space-y-1">
            {groundedReferences.map((reference, index) => (
              <li
                key={`grounded-${index}`}
                className="text-xs leading-5 text-ink-2"
              >
                {reference}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function EmptyPromptCard({ activeMode }: { activeMode: PracticeMode }) {
  const headline =
    activeMode === "interview"
      ? "No interview question selected"
      : "No practice prompt selected";
  const hint =
    activeMode === "interview"
      ? "Generate or pick a resume-based question above, or just practice a free answer."
      : "Just start practicing — PitchPilot scores delivery and clarity from your speech.";
  return (
    <section className="rounded-md border border-line-2 bg-bg-2 p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-bg-3 text-ink-2">
          <Lightbulb className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-ink-0">{headline}</h2>
          <p className="mt-1 text-[12.5px] leading-5 text-ink-2">{hint}</p>
        </div>
      </div>
    </section>
  );
}

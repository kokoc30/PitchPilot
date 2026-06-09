import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Star,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ResumeQuestion } from "../../lib/api";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";

export type ResumeQuestionTab = "generated" | "saved";

type ResumeQuestionHistoryPanelProps = {
  activeTab: ResumeQuestionTab;
  generatedQuestions: ResumeQuestion[];
  savedQuestions: ResumeQuestion[];
  selectedQuestionId?: string | null;
  isGenerating: boolean;
  historyLoading: boolean;
  historyError?: string | null;
  generationError?: string | null;
  warnings: string[];
  onActiveTabChange: (tab: ResumeQuestionTab) => void;
  onPractice: (question: ResumeQuestion) => void;
  onToggleFavorite: (question: ResumeQuestion) => void;
  onDelete: (question: ResumeQuestion) => void;
  onClearGenerated: () => void;
  onRegenerate: () => void;
};

type PracticeFilter = "all" | "favorites" | "practiced" | "unpracticed";

export function ResumeQuestionHistoryPanel({
  activeTab,
  generatedQuestions,
  savedQuestions,
  selectedQuestionId,
  isGenerating,
  historyLoading,
  historyError,
  generationError,
  warnings,
  onActiveTabChange,
  onPractice,
  onToggleFavorite,
  onDelete,
  onClearGenerated,
  onRegenerate,
}: ResumeQuestionHistoryPanelProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [source, setSource] = useState("all");
  const [practiceFilter, setPracticeFilter] = useState<PracticeFilter>("all");

  const currentQuestions =
    activeTab === "generated" ? generatedQuestions : savedQuestions;
  const allQuestions = [...generatedQuestions, ...savedQuestions];

  const categoryOptions = useMemo(
    () => uniqueOptions(allQuestions.map((question) => question.category)),
    [allQuestions],
  );
  const difficultyOptions = useMemo(
    () => uniqueOptions(allQuestions.map((question) => question.difficulty)),
    [allQuestions],
  );
  const sourceOptions = useMemo(
    () => uniqueOptions(allQuestions.map((question) => question.source)),
    [allQuestions],
  );

  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return currentQuestions.filter((question) => {
      const matchesSearch =
        !query ||
        question.question.toLowerCase().includes(query) ||
        question.category.toLowerCase().includes(query) ||
        (question.suggestedAnswerAngle ?? "").toLowerCase().includes(query);
      const matchesCategory = category === "all" || question.category === category;
      const matchesDifficulty =
        difficulty === "all" || question.difficulty === difficulty;
      const matchesSource = source === "all" || question.source === source;
      const practiced = Number(question.practicedCount ?? 0) > 0;
      const matchesPractice =
        practiceFilter === "all" ||
        (practiceFilter === "favorites" && Boolean(question.isFavorite)) ||
        (practiceFilter === "practiced" && practiced) ||
        (practiceFilter === "unpracticed" && !practiced);
      return (
        matchesSearch &&
        matchesCategory &&
        matchesDifficulty &&
        matchesSource &&
        matchesPractice
      );
    });
  }, [category, currentQuestions, difficulty, practiceFilter, search, source]);

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="inline-flex rounded-md border border-line-2 bg-bg-1 p-1">
          <TabButton
            active={activeTab === "generated"}
            count={generatedQuestions.length}
            label="Generated"
            onClick={() => onActiveTabChange("generated")}
          />
          <TabButton
            active={activeTab === "saved"}
            count={savedQuestions.length}
            label="Saved"
            onClick={() => onActiveTabChange("saved")}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isGenerating}
            icon={
              isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              )
            }
            onClick={onRegenerate}
            size="sm"
            variant="ghost"
          >
            Regenerate
          </Button>
          {generatedQuestions.length > 0 && (
            <Button
              icon={<X className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={onClearGenerated}
              size="sm"
              variant="quiet"
            >
              Clear generated
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
            aria-hidden="true"
          />
          <input
            className="h-9 w-full rounded-md border border-line-2 bg-bg-1 pl-9 pr-3 text-sm text-ink-0 placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search questions"
            value={search}
          />
        </label>
        <FilterSelect label="Category" onChange={setCategory} value={category}>
          <option value="all">All categories</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Difficulty" onChange={setDifficulty} value={difficulty}>
          <option value="all">All difficulty</option>
          {difficultyOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Source" onChange={setSource} value={source}>
          <option value="all">All sources</option>
          {sourceOptions.map((option) => (
            <option key={option} value={option}>
              {sourceLabel(option)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Status"
          onChange={(value) => setPracticeFilter(value as PracticeFilter)}
          value={practiceFilter}
        >
          <option value="all">All status</option>
          <option value="favorites">Favorites</option>
          <option value="practiced">Practiced</option>
          <option value="unpracticed">Unpracticed</option>
        </FilterSelect>
      </div>

      {historyLoading && (
        <MessageRow tone="info" text="Loading saved question history." />
      )}
      {generationError && <MessageRow tone="error" text={generationError} />}
      {historyError && <MessageRow tone="warning" text={historyError} />}
      {warnings.map((warning) => (
        <MessageRow key={warning} tone="warning" text={warning} />
      ))}

      {filteredQuestions.length === 0 ? (
        <div className="rounded-md border border-line-1 bg-bg-1 p-4 text-sm text-ink-3">
          {currentQuestions.length === 0
            ? activeTab === "generated"
              ? "No generated questions yet."
              : "No saved questions yet."
            : "No questions match the current filters."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((question) => (
            <QuestionRow
              isSelected={selectedQuestionId === question.id}
              key={question.id}
              onDelete={() => onDelete(question)}
              onPractice={() => onPractice(question)}
              onToggleFavorite={() => onToggleFavorite(question)}
              question={question}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-[7px] px-3 text-[12.5px] font-medium transition",
        active ? "bg-cyan-500 text-white" : "text-ink-2 hover:bg-bg-3",
      )}
      onClick={onClick}
      type="button"
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 font-mono text-[10px]",
          active ? "bg-white/15 text-white" : "bg-bg-4 text-ink-3",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        className="h-9 w-full rounded-md border border-line-2 bg-bg-1 px-2 text-sm text-ink-0 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

export function QuestionRow({
  question,
  isSelected,
  onPractice,
  onToggleFavorite,
  onDelete,
}: {
  question: ResumeQuestion;
  isSelected: boolean;
  onPractice: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const persisted = Boolean(question.isPersisted);
  const practicedCount = Number(question.practicedCount ?? 0);
  const groundedReferences = Array.isArray(question.groundedIn)
    ? question.groundedIn
    : [];
  const sourceTone =
    question.source === "resume"
      ? "cyan"
      : question.source === "general"
        ? "muted"
        : "amber";

  return (
    <article
      className={cn(
        "rounded-md border bg-bg-1 p-3.5 transition",
        isSelected
          ? "border-cyan-400/45 bg-cyan-500/[0.06]"
          : "border-line-1 hover:border-line-2",
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-6 text-ink-0">{question.question}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge label={question.category} tone="muted" />
            <StatusBadge
              label={question.difficulty}
              tone={
                question.difficulty === "hard"
                  ? "amber"
                  : question.difficulty === "easy"
                    ? "muted"
                    : "cyan"
              }
            />
            <StatusBadge label={sourceLabel(question.source)} tone={sourceTone} />
            {question.isFavorite && <StatusBadge label="favorite" tone="cyan" />}
            {practicedCount > 0 && (
              <StatusBadge label={`practiced ${practicedCount}`} tone="muted" />
            )}
          </div>
          {question.lastPracticedAt && isExpanded && (
            <p className="mt-2 text-[11px] text-ink-3">
              Last practiced {formatDateTime(question.lastPracticedAt)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          <Button
            onClick={onPractice}
            size="sm"
            variant={isSelected ? "primary" : "ghost"}
          >
            {isSelected ? "Selected" : "Practice this"}
          </Button>
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            size="sm"
            variant="quiet"
            icon={isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          >
            Details
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3.5 space-y-3.5 border-t border-line-2 pt-3.5">
          {/* Metadata & Actions inside disclosure */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!persisted}
              icon={
                <Star
                  className={cn(
                    "h-3.5 w-3.5",
                    question.isFavorite && "fill-current",
                  )}
                  aria-hidden="true"
                />
              }
              onClick={onToggleFavorite}
              size="sm"
              title={
                persisted
                  ? question.isFavorite
                    ? "Remove favorite"
                    : "Favorite question"
                  : "Question history is not saved"
              }
              variant={question.isFavorite ? "ghost" : "quiet"}
            >
              {question.isFavorite ? "Favorited" : "Favorite"}
            </Button>
            {persisted && (
              <Button
                icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={onDelete}
                size="sm"
                variant="quiet"
              >
                Delete
              </Button>
            )}
          </div>

          {groundedReferences.length > 0 && (
            <div className="rounded-md border border-line-1 bg-bg-2 px-3 py-2">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                Grounded in
              </p>
              <ul className="mt-1 space-y-1">
                {groundedReferences.map((reference, index) => (
                  <li
                    className="text-xs leading-5 text-ink-2"
                    key={`${question.id}-grounded-${index}`}
                  >
                    {reference}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {question.suggestedAnswerAngle && (
            <div className="rounded-md border border-line-1 bg-bg-2 px-3 py-2">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                Answer angle
              </p>
              <p className="mt-1 text-xs leading-5 text-ink-2">
                {question.suggestedAnswerAngle}
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function MessageRow({
  text,
  tone,
}: {
  text: string;
  tone: "warning" | "error" | "info";
}) {
  const Icon = tone === "info" ? CheckCircle2 : AlertTriangle;
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border p-3 text-xs leading-5",
        tone === "info" &&
          "border-cyan-500/25 bg-cyan-500/[0.06] text-cyan-200",
        tone === "warning" &&
          "border-amber-500/25 bg-amber-500/[0.06] text-amber-200",
        tone === "error" && "border-red-500/25 bg-red-500/[0.06] text-red-200",
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}

function uniqueOptions(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
  ).sort((a, b) => a.localeCompare(b));
}

function sourceLabel(value: string): string {
  if (value === "resume") return "from resume";
  if (value === "mock") return "mock";
  return "general";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

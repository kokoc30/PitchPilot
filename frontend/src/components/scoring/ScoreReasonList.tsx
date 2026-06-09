import {
  AlertTriangle,
  ArrowUpCircle,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  ScoreCategory,
  ScoreReason,
  ScoreStatus,
} from "../../lib/scoring";
import { cn } from "../../lib/utils";

type ScoreReasonListProps = {
  reasons: ScoreReason[];
  improvementHints: string[];
  status: ScoreStatus;
};

export function ScoreReasonList({
  reasons,
  improvementHints,
  status,
}: ScoreReasonListProps) {
  const strengths = reasons.filter((reason) => reason.type === "strength");
  const improvements = reasons.filter((reason) => reason.type === "improvement");
  const warnings = reasons.filter((reason) => reason.type === "warning");

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <ReasonGroup
        emptyText={
          status === "ready"
            ? "No strengths detected yet."
            : "Strengths appear after scoring is ready."
        }
        icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
        items={strengths}
        title="Strengths"
        tone="strength"
      />
      <ReasonGroup
        emptyText={
          status === "ready"
            ? "No priority improvements detected."
            : "Improvement areas appear after scoring is ready."
        }
        icon={<ArrowUpCircle className="h-3.5 w-3.5" aria-hidden="true" />}
        items={improvements}
        title="Improvement areas"
        tone="improvement"
      />
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-300" aria-hidden="true">
            {warnings.length > 0 ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <Lightbulb className="h-3.5 w-3.5" />
            )}
          </span>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Hints
          </p>
        </div>

        {warnings.length > 0 && (
          <ul className="mt-3 space-y-2">
            {warnings.map((reason) => (
              <li
                className="text-xs leading-5 text-amber-100"
                key={`${reason.category}-${reason.message}`}
              >
                {reason.message}
              </li>
            ))}
          </ul>
        )}

        <ul className="mt-3 space-y-2">
          {improvementHints.map((hint) => (
            <li className="text-xs leading-5 text-zinc-400" key={hint}>
              {hint}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

type ReasonGroupProps = {
  title: string;
  items: ScoreReason[];
  emptyText: string;
  icon: ReactNode;
  tone: "strength" | "improvement";
};

function ReasonGroup({
  title,
  items,
  emptyText,
  icon,
  tone,
}: ReasonGroupProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            tone === "strength" ? "text-emerald-300" : "text-cyan-300",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {title}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-xs leading-5 text-zinc-500">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              className="text-xs leading-5 text-zinc-300"
              key={`${item.category}-${item.message}`}
            >
              <span className="font-medium text-zinc-200">
                {categoryLabel(item.category)}:
              </span>{" "}
              {item.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function categoryLabel(category: ScoreCategory): string {
  switch (category) {
    case "clarity":
      return "Clarity";
    case "pace":
      return "Pace";
    case "delivery":
      return "Delivery";
    case "engagement":
      return "Engagement";
    case "camera_facing":
      return "Camera-facing";
    case "overall":
      return "Overall";
  }
}

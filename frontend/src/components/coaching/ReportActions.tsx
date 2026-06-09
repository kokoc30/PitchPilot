import { Loader2, RefreshCcw, Sparkles, Trash2 } from "lucide-react";
import type { CoachingReportStatus } from "../../hooks/useCoachingReport";
import { Button } from "../ui/Button";

type ReportActionsProps = {
  status: CoachingReportStatus;
  canGenerate: boolean;
  onGenerate: () => void;
  onClear: () => void;
  hasReport: boolean;
};

export function ReportActions({
  status,
  canGenerate,
  onGenerate,
  onClear,
  hasReport,
}: ReportActionsProps) {
  const isGenerating = status === "generating";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        disabled={!canGenerate || isGenerating}
        icon={
          isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : hasReport ? (
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )
        }
        onClick={onGenerate}
        size="sm"
      >
        {hasReport ? "Regenerate" : "Generate AI Report"}
      </Button>
      <Button
        disabled={!hasReport && status !== "error"}
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        onClick={onClear}
        size="sm"
        variant="ghost"
      >
        Clear report
      </Button>
    </div>
  );
}

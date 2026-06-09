import { FileText } from "lucide-react";

type RewrittenAnswerCardProps = {
  rewrittenAnswer: string;
};

export function RewrittenAnswerCard({ rewrittenAnswer }: RewrittenAnswerCardProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-cyan-300" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-white">Improved answer</h3>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-200">
        {rewrittenAnswer || "No rewritten answer was returned."}
      </p>
    </div>
  );
}

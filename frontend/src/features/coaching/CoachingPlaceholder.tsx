import { Lightbulb } from "lucide-react";
import { Card } from "../../components/ui/Card";

export function CoachingPlaceholder() {
  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-amber-300">
          <Lightbulb className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Coaching placeholder</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Future feedback will combine transcript quality, delivery rhythm, camera posture, and AI-generated coaching notes.
          </p>
        </div>
      </div>
    </Card>
  );
}

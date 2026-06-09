import { Activity, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../ui/Card";

export function EmptyDashboardState() {
  return (
    <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-line-2 bg-transparent">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-bg-3 mb-4">
        <Activity className="h-5 w-5 text-ink-3" />
      </div>
      <h3 className="text-[18px] font-medium text-ink-0 mb-2">No sessions yet</h3>
      <Link
        to="/practice"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-cyan-300 hover:text-cyan-200 transition-colors"
      >
        Start your first run
        <Play className="h-3.5 w-3.5" />
      </Link>
    </Card>
  );
}

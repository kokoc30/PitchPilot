import { Activity, BarChart3, Clock, TrendingUp, Camera, MessageSquare } from "lucide-react";
import { Card } from "../ui/Card";
import type { SessionAnalytics } from "../../hooks/useSessionAnalytics";
import { titleCase } from "../../lib/utils";

export type DashboardSummaryCardsProps = {
  analytics: SessionAnalytics;
};

export function DashboardSummaryCards({ analytics }: DashboardSummaryCardsProps) {
  const stats = [
    {
      label: "Total sessions",
      value: analytics.totalSessions.toString(),
      helper: "Total saved practice sessions.",
      icon: Activity,
    },
    {
      label: "Average score",
      value: analytics.averageScore !== null ? analytics.averageScore.toString() : "--",
      helper: analytics.bestScore !== null ? `Best: ${analytics.bestScore}` : "No scores yet.",
      icon: BarChart3,
    },
    {
      label: "Average WPM",
      value: analytics.averageWpm !== null ? analytics.averageWpm.toString() : "--",
      helper: "Words per minute.",
      icon: MessageSquare,
    },
    {
      label: "Average camera",
      value: analytics.averageCameraFacing !== null ? `${analytics.averageCameraFacing}%` : "--",
      helper: "Time spent looking at camera.",
      icon: Camera,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-3">{stat.label}</p>
              <p className="mt-2 font-mono text-[28px] font-medium text-ink-0 tabular-nums">{stat.value}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300">
              <stat.icon className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-4 text-[12.5px] leading-[1.5] text-ink-3">{stat.helper}</p>
        </Card>
      ))}
    </div>
  );
}

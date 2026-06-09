import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type CoachingAccent = "cyan" | "emerald" | "amber" | "rose" | "zinc";

type CoachingReportCardProps = {
  title: string;
  items?: string[];
  children?: ReactNode;
  icon?: ReactNode;
  accent?: CoachingAccent;
  emptyText?: string;
  className?: string;
};

const accentStyles: Record<CoachingAccent, string> = {
  cyan: "text-cyan-300",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  rose: "text-red-400",
  zinc: "text-ink-2",
};

export function CoachingReportCard({
  title,
  items,
  children,
  icon,
  accent = "cyan",
  emptyText = "No items returned.",
  className,
}: CoachingReportCardProps) {
  return (
    <div className={cn("rounded-md border border-line-2 bg-bg-2 p-4", className)}>
      <div className="flex items-center gap-2">
        {icon && (
          <span className={accentStyles[accent]} aria-hidden="true">
            {icon}
          </span>
        )}
        <h3 className="text-[14px] font-medium text-ink-0">{title}</h3>
      </div>

      {items ? (
        items.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li className="text-[13px] leading-[1.55] text-ink-1" key={item}>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[13px] leading-[1.55] text-ink-3">{emptyText}</p>
        )
      ) : (
        <div className="mt-3">{children}</div>
      )}
    </div>
  );
}

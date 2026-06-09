import { cn } from "../../lib/utils";

type StatusTone =
  | "online"
  | "pending"
  | "offline"
  | "warning"
  | "cyan"
  | "primary"
  | "amber"
  | "success"
  | "red"
  | "muted";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

const toneClasses: Record<StatusTone, string> = {
  online:
    "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  success:
    "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  pending:
    "border-orange-400/35 bg-orange-500/10 text-orange-200",
  amber:
    "border-orange-400/35 bg-orange-500/10 text-orange-200",
  warning:
    "border-orange-400/35 bg-orange-500/10 text-orange-200",
  offline: "border-white/10 bg-white/[0.05] text-white/70",
  muted: "border-white/10 bg-white/[0.04] text-white/50",
  cyan:
    "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
  primary:
    "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
  red: "border-red-500/30 bg-red-500/10 text-red-300",
};

const dotClasses: Record<StatusTone, string> = {
  online: "bg-emerald-400",
  success: "bg-emerald-400",
  pending: "bg-orange-400",
  amber: "bg-orange-400",
  warning: "bg-orange-400",
  offline: "bg-white/40",
  muted: "bg-white/30",
  cyan: "bg-cyan-400",
  primary: "bg-cyan-400",
  red: "bg-red-400",
};

export function StatusBadge({ label, tone = "offline" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-[24px] max-w-full items-center gap-2 rounded-full border px-2.5 font-mono text-[11px] font-medium tracking-wider",
        toneClasses[tone],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone])} />
      <span className="truncate">{label}</span>
    </span>
  );
}

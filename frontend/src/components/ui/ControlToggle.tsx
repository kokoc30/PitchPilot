/**
 * ControlToggle
 *
 * Compact accessible toggle button for camera and microphone controls.
 * On/active state uses cyan (the app's brand accent).
 * Amber = warning/reconnecting. Red = real error.
 */

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

export type ControlToggleStatus =
  | "off"
  | "on"
  | "starting"
  | "stopping"
  | "error"
  | "warning"
  | "unsupported";

export type ControlToggleProps = {
  /** Visible label shown below the icon */
  label: string;
  /** Icon node rendered inside the toggle button */
  icon?: ReactNode;
  /** Whether the control is currently active/on */
  checked: boolean;
  /** Loading spinner override — disables toggle while true */
  loading?: boolean;
  /** Error state — renders red styling */
  error?: boolean;
  /** Warning/reconnecting state — renders amber styling */
  warning?: boolean;
  /** Fully disables the toggle */
  disabled?: boolean;
  /** Status label shown beneath the main label */
  statusText?: string;
  /** Called when the user clicks the toggle */
  onToggle: () => void;
  className?: string;
};

export function ControlToggle({
  label,
  icon,
  checked,
  loading = false,
  error = false,
  warning = false,
  disabled = false,
  statusText,
  onToggle,
  className,
}: ControlToggleProps) {
  const isDisabled = disabled || loading;

  // Determine visual state
  const stateClasses = (() => {
    if (error) {
      return {
        button:
          "border-rose-500/40 bg-rose-500/10 text-rose-300 ring-rose-500/30 hover:bg-rose-500/15",
        dot: "bg-rose-400",
        status: "text-rose-400",
      };
    }
    if (warning) {
      return {
        button:
          "border-orange-500/40 bg-orange-500/10 text-orange-200 ring-orange-500/30 hover:bg-orange-500/15",
        dot: "bg-orange-400",
        status: "text-orange-300",
      };
    }
    if (checked && !loading) {
      return {
        button:
          "border-cyan-400/40 bg-cyan-500/10 text-cyan-100 ring-cyan-400/25 hover:bg-cyan-500/15",
        dot: "bg-cyan-400",
        status: "text-cyan-200",
      };
    }
    if (loading) {
      return {
        button:
          "border-white/10 bg-white/[0.05] text-white/70 ring-transparent",
        dot: "bg-orange-400 animate-pulse",
        status: "text-orange-300",
      };
    }
    // off / default
    return {
      button:
        "border-white/10 bg-white/[0.04] text-white/55 ring-transparent hover:border-white/20 hover:bg-white/[0.08] hover:text-white",
      dot: "bg-white/40",
      status: "text-white/45",
    };
  })();

  const resolvedStatusText = statusText ?? (
    loading
      ? "Starting…"
      : error
        ? "Error"
        : warning
          ? "Reconnecting…"
          : checked
            ? "On"
            : "Off"
  );

  return (
    <button
      aria-checked={checked}
      aria-disabled={isDisabled}
      aria-label={`${label}: ${resolvedStatusText}`}
      className={cn(
        "group flex flex-col items-center gap-1.5 rounded-xl border px-3.5 py-2.5",
        "ring-1 transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
        isDisabled && "cursor-not-allowed opacity-50",
        stateClasses.button,
        className,
      )}
      disabled={isDisabled}
      onClick={onToggle}
      role="switch"
      type="button"
    >
      {/* Icon / spinner row */}
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/20">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-current" aria-hidden="true" />
        ) : (
          <span className="text-current" aria-hidden="true">
            {icon}
          </span>
        )}
      </span>

      {/* Label + status */}
      <span className="flex flex-col items-center gap-0.5">
        <span className="text-[12px] font-semibold leading-none text-current">
          {label}
        </span>
        <span className={cn("flex items-center gap-1 text-[10px] font-mono leading-none", stateClasses.status)}>
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              stateClasses.dot,
            )}
          />
          {resolvedStatusText}
        </span>
      </span>
    </button>
  );
}

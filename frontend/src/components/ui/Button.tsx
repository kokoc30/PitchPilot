import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

type ButtonVariant =
  | "primary"
  | "cta"
  | "ghost"
  | "quiet"
  | "destructive"
  | "secondary";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  // Solid cyan — default primary action
  primary:
    "bg-cyan-500 text-black hover:bg-cyan-400 focus-visible:ring-cyan-400 shadow-[0_6px_20px_-8px_rgba(6,182,212,0.7)]",
  // Cyan → orange gradient — reserved for hero / marquee CTAs
  cta:
    "bg-gradient-to-r from-cyan-500 to-orange-500 text-white hover:from-cyan-400 hover:to-orange-400 focus-visible:ring-cyan-400 shadow-[0_8px_28px_-10px_rgba(6,182,212,0.55)]",
  // Glass ghost
  ghost:
    "border border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.1] hover:border-white/20 focus-visible:ring-cyan-400",
  quiet:
    "bg-transparent text-white/70 hover:bg-white/[0.08] hover:text-white focus-visible:ring-cyan-400",
  destructive:
    "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-400",
  // Backwards-compatible alias — same surface as ghost so existing call sites keep working.
  secondary:
    "border border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.1] hover:border-white/20 focus-visible:ring-cyan-400",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-[32px] px-4 text-[12.5px] rounded-full",
  md: "h-[40px] px-5 text-[13.5px] rounded-full",
  lg: "h-[48px] px-7 text-[14.5px] rounded-full",
};

export function Button({
  className,
  children,
  variant = "primary",
  size = "md",
  icon,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      type={type}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

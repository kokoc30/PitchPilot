import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  raised?: boolean;
};

export function Card({ className, raised, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 p-[22px] backdrop-blur-sm transition-colors",
        raised
          ? "bg-white/[0.07] shadow-card"
          : "bg-white/[0.045]",
        "hover:border-white/20",
        className,
      )}
      {...props}
    />
  );
}

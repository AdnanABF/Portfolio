import type { HTMLAttributes } from "react";

type BadgeColor = "default" | "yellow" | "violet" | "coral" | "mint" | "sky";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
}

const colorStyles: Record<BadgeColor, string> = {
  default: "bg-surface-2 text-foreground",
  yellow: "bg-accent-yellow text-neutral-950 font-bold",
  violet: "bg-accent-violet text-neutral-950 dark:text-white font-bold",
  coral: "bg-accent-coral text-neutral-950 dark:text-white font-bold",
  mint: "bg-accent-mint text-neutral-950 dark:text-neutral-950 font-bold",
  sky: "bg-accent-sky text-neutral-950 dark:text-white font-bold",
};

export function Badge({ color = "default", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border-2 border-line px-2.5 py-0.5 font-mono text-xs font-bold shadow-[2px_2px_0px_var(--shadow-color)] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px] ${colorStyles[color]} ${className}`}
      {...props}
    />
  );
}

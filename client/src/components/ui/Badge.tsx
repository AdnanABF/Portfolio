import type { HTMLAttributes } from "react";

export function Badge({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-line bg-cream px-2.5 py-1 font-mono text-xs text-primary dark:bg-surface ${className}`}
      {...props}
    />
  );
}

import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type CommonProps = {
  variant?: "primary" | "secondary" | "ghost";
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & CommonProps;
type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> &
  CommonProps & { href: string };

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const variants: Record<NonNullable<CommonProps["variant"]>, string> = {
  primary:
    "bg-primary text-white shadow-[0_8px_24px_-12px_rgba(14,116,144,0.6)] hover:bg-primary-strong dark:bg-primary dark:text-black dark:hover:bg-primary-strong",
  secondary:
    "border border-line bg-surface text-foreground hover:border-primary hover:text-primary",
  ghost: "text-muted hover:bg-cream hover:text-foreground dark:hover:bg-surface",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function LinkButton({ variant = "primary", className = "", ...props }: LinkButtonProps) {
  return <a className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

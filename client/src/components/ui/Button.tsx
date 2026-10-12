import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type CommonProps = {
  variant?: "primary" | "secondary" | "ghost";
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & CommonProps;
type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> &
  CommonProps & { href: string };

const base =
  "inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer";

const variants: Record<NonNullable<CommonProps["variant"]>, string> = {
  primary: "neo-button-primary",
  secondary: "neo-button-secondary",
  ghost: "text-muted hover:bg-cream hover:text-foreground",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function LinkButton({ variant = "primary", className = "", ...props }: LinkButtonProps) {
  return <a className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

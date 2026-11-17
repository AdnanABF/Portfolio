import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface AccountShellProps {
  icon: ComponentType<{ className?: string }>;
  /** Small label above the title, in the "// SECURE ACCESS" style used across the site. */
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Links under the card, for example "Already have an account? Sign in". */
  footer?: ReactNode;
}

/** The card every public account page sits in (sign in, sign up, reset password...), matching the admin login. */
export function AccountShell({ icon: Icon, eyebrow, title, subtitle, children, footer }: AccountShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pt-28 pb-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border-3 border-line bg-surface p-8 shadow-[8px_8px_0px_var(--shadow-color)]">
          <Link href="/" className="mb-6 inline-flex items-center gap-1.5 font-mono text-xs font-bold text-muted hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Portfolio</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-line bg-primary text-white shadow-[2px_2px_0px_var(--shadow-color)]">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <span className="font-mono text-xs font-bold text-primary">{`// ${eyebrow}`}</span>
              <h1 className="text-2xl font-extrabold text-foreground">{title}</h1>
            </div>
          </div>

          {subtitle && <p className="mt-4 font-mono text-xs leading-relaxed text-muted">{subtitle}</p>}

          <div className="mt-6">{children}</div>
        </div>

        {footer && <div className="mt-5 text-center font-mono text-xs text-muted">{footer}</div>}
      </div>
    </div>
  );
}

/** A coloured message box used inside the account cards. */
export function Alert({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  const style =
    kind === "error"
      ? "border-accent-coral bg-accent-coral/10 text-accent-coral"
      : kind === "success"
        ? "border-accent-mint bg-accent-mint/15 text-foreground"
        : "border-line bg-surface-2 text-foreground";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-xl border-2 p-3 font-mono text-xs leading-relaxed ${style}`}>
      {children}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleCheck, KeyRound, Loader2, MailCheck, MailQuestion, ShieldAlert } from "lucide-react";
import { Alert, AccountShell } from "@/components/account/AccountShell";
import { PASSWORD_HINT, PasswordField, passwordProblem } from "@/components/account/PasswordField";
import { errorText, fieldError } from "@/components/account/errors";
import { FormField, inputClass } from "@/components/ui/FormField";
import { forgotPassword, setPasswordWithToken, verifyEmail } from "@/lib/api-client";

/** The user id and token that the emailed links carry. Both must be there for the link to mean anything. */
function useLinkParams() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("uid");
  const token = searchParams.get("token");
  // The same object until the link changes, so effects can depend on it.
  return useMemo(() => (userId && token ? { userId, token } : null), [userId, token]);
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

/** Opened from the confirmation email: confirms the address as soon as the page loads. */
export function VerifyEmailPanel() {
  const link = useLinkParams();
  const [state, setState] = useState<{ kind: "working" } | { kind: "done"; message: string } | { kind: "failed"; message: string }>(
    link ? { kind: "working" } : { kind: "failed", message: "This link is incomplete. Open the link from your email again." },
  );

  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    verifyEmail(link.userId, link.token)
      .then((result) => {
        if (!cancelled) setState({ kind: "done", message: result?.message ?? "Your email is confirmed. You can sign in now." });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ kind: "failed", message: errorText(error, "This link is invalid or has expired.") });
      });
    return () => {
      cancelled = true;
    };
  }, [link]);

  return (
    <AccountShell
      icon={state.kind === "failed" ? ShieldAlert : MailCheck}
      eyebrow="EMAIL"
      title={state.kind === "working" ? "Confirming..." : state.kind === "done" ? "Email confirmed" : "Link problem"}
      footer={
        <Link href="/login" className="font-bold text-primary hover:underline">
          Go to sign in
        </Link>
      }
    >
      {state.kind === "working" && (
        <div className="flex items-center gap-2 font-mono text-xs text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Checking your link...
        </div>
      )}
      {state.kind === "done" && <Alert kind="success">{state.message}</Alert>}
      {state.kind === "failed" && (
        <div className="space-y-3">
          <Alert kind="error">{state.message}</Alert>
          <p className="font-mono text-xs text-muted">
            Try to sign in: if the account still needs confirming, you can ask for a new link there.
          </p>
        </div>
      )}
    </AccountShell>
  );
}

// ---------------------------------------------------------------------------
// Choose a password: accepting an invite, or finishing a reset
// ---------------------------------------------------------------------------

interface SetPasswordFormProps {
  /** "accept-invite" for a new member's first password, "reset-password" for a forgotten one. */
  kind: "accept-invite" | "reset-password";
}

/** Choose a password through an emailed link. The link is single-use: once the password is set it stops working. */
export function SetPasswordForm({ kind }: SetPasswordFormProps) {
  const link = useLinkParams();
  const invite = kind === "accept-invite";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !link) return;

    const problem = passwordProblem(password);
    const next = { password: problem, confirm: confirm !== password ? "The passwords do not match." : undefined };
    setErrors(next);
    if (next.password || next.confirm) return;

    setBusy(true);
    try {
      await setPasswordWithToken(kind, link.userId, link.token, password);
      setDone(true);
    } catch (e) {
      setErrors({ password: fieldError(e, "password"), form: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const title = invite ? "Set your password" : "Choose a new password";

  if (!link) {
    return (
      <AccountShell icon={ShieldAlert} eyebrow={invite ? "INVITATION" : "RESET"} title="Link problem" footer={<Link href="/login" className="font-bold text-primary hover:underline">Go to sign in</Link>}>
        <Alert kind="error">This link is incomplete. Open the link from your email again.</Alert>
      </AccountShell>
    );
  }

  if (done) {
    return (
      <AccountShell icon={CircleCheck} eyebrow={invite ? "WELCOME" : "ALL SET"} title="Password saved">
        <div className="space-y-4">
          <Alert kind="success">{invite ? "Your account is ready." : "Your password was changed and other devices were signed out."} You can sign in now.</Alert>
          <Link href="/login" className="neo-button-primary flex w-full items-center justify-center gap-2 px-5 py-3 text-sm font-bold">
            Go to sign in
          </Link>
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell
      icon={KeyRound}
      eyebrow={invite ? "INVITATION" : "RESET"}
      title={title}
      subtitle={invite ? "Choose a password to activate your account." : "Choose a new password for your account."}
      footer={
        !invite && (
          <Link href="/forgot-password" className="hover:text-primary hover:underline">
            Link not working? Get a new one
          </Link>
        )
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors.form && !errors.password && <Alert kind="error">{errors.form}</Alert>}
        <PasswordField id="set-password" label="New password" value={password} onChange={setPassword} error={errors.password} hint={PASSWORD_HINT} autoComplete="new-password" disabled={busy} />
        <PasswordField id="set-password-confirm" label="Confirm password" value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" disabled={busy} />
        <button
          type="submit"
          disabled={busy}
          className="neo-button-primary flex w-full cursor-pointer items-center justify-center gap-2 px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          <span>Save password</span>
        </button>
      </form>
    </AccountShell>
  );
}

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Asks for the account email and sends a reset link. The answer is the same whether or not the email has an account. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountShell
      icon={sent ? MailCheck : MailQuestion}
      eyebrow="RESET"
      title={sent ? "Check your email" : "Forgot your password?"}
      subtitle={sent ? undefined : "Enter your email and we will send you a link to choose a new password."}
      footer={
        <Link href="/login" className="font-bold text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <Alert kind="success">If an account exists for {email.trim()}, a reset link is on its way. It works for 3 days.</Alert>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <Alert kind="error">{error}</Alert>}
          <FormField label="Email" htmlFor="forgot-email">
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              disabled={busy}
              className={inputClass}
            />
          </FormField>
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="neo-button-primary flex w-full cursor-pointer items-center justify-center gap-2 px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailQuestion className="h-4 w-4" />}
            <span>Send reset link</span>
          </button>
        </form>
      )}
    </AccountShell>
  );
}

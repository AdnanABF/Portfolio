"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck, UserPlus } from "lucide-react";
import { Alert, AccountShell } from "@/components/account/AccountShell";
import { PASSWORD_HINT, PasswordField, passwordProblem } from "@/components/account/PasswordField";
import { errorText, fieldError } from "@/components/account/errors";
import { useAdmin, useFreshSession } from "@/components/admin/AdminContext";
import { FormField, inputClass } from "@/components/ui/FormField";
import { registerAccount, resendVerification } from "@/lib/api-client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<Record<"fullName" | "email" | "password" | "confirm" | "form", string>>;

/**
 * Public sign-up. Two traps catch bots without bothering people: a hidden "website" field that a person never
 * sees (and so never fills in), and the time the form was opened (a bot submits within a moment).
 */
export function SignUpForm() {
  const router = useRouter();
  const { account, isAdmin, isLoading: authLoading } = useAdmin();
  const sessionChecked = useFreshSession();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [trap, setTrap] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  // When the form was opened, on the browser's own stopwatch. Only the elapsed time is sent: the visitor's clock
  // may be wrong, and a wrong clock must not make a real person look like a bot.
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = performance.now();
  }, []);

  useEffect(() => {
    if (sessionChecked && !authLoading && account) router.replace(isAdmin ? "/admin" : "/account");
  }, [sessionChecked, authLoading, account, isAdmin, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    const next: Errors = {};
    if (!fullName.trim()) next.fullName = "Name is required.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = "Enter a valid email address.";
    next.password = passwordProblem(password);
    if (confirm !== password) next.confirm = "The passwords do not match.";
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v)) as Errors;
    setErrors(clean);
    if (Object.keys(clean).length > 0) return;

    setBusy(true);
    try {
      await registerAccount({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        contactPrefUrl: trap,
        fillTimeMs: Math.round(performance.now() - openedAt.current),
      });
      setSentTo(email.trim());
    } catch (e) {
      setErrors({
        fullName: fieldError(e, "fullName"),
        email: fieldError(e, "email"),
        password: fieldError(e, "password"),
        form: errorText(e),
      });
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!sentTo) return;
    try {
      await resendVerification(sentTo);
      setResent(true);
    } catch (e) {
      setErrors({ form: errorText(e) });
    }
  };

  if (authLoading || !sessionChecked || account) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex items-center gap-2 font-mono text-xs text-muted">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Checking your session...
        </div>
      </div>
    );
  }

  if (sentTo) {
    return (
      <AccountShell
        icon={MailCheck}
        eyebrow="ALMOST DONE"
        title="Check your email"
        footer={
          <Link href="/login" className="font-bold text-primary hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="space-y-4">
          <Alert kind="success">
            If {sentTo} can be registered, we sent it a confirmation link. Open it to activate your account, then sign in.
          </Alert>
          <p className="font-mono text-xs text-muted">The link works for 3 days. Nothing in your inbox? Look in spam, or ask for a new link.</p>
          {errors.form && <Alert kind="error">{errors.form}</Alert>}
          {resent ? (
            <Alert kind="info">A new link is on its way if the account still needs one.</Alert>
          ) : (
            <button type="button" onClick={resend} className="cursor-pointer font-mono text-xs font-bold text-primary hover:underline">
              Send the link again
            </button>
          )}
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell
      icon={UserPlus}
      eyebrow="JOIN"
      title="Create an account"
      footer={
        <p>
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors.form && <Alert kind="error">{errors.form}</Alert>}

        <FormField label="Full name" htmlFor="signup-name" error={errors.fullName}>
          <input
            id="signup-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            maxLength={100}
            aria-invalid={Boolean(errors.fullName)}
            disabled={busy}
            className={inputClass}
          />
        </FormField>

        <FormField label="Email" htmlFor="signup-email" error={errors.email}>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoCapitalize="none"
            maxLength={150}
            aria-invalid={Boolean(errors.email)}
            disabled={busy}
            className={inputClass}
          />
        </FormField>

        <PasswordField id="signup-password" label="Password" value={password} onChange={setPassword} error={errors.password} hint={PASSWORD_HINT} autoComplete="new-password" disabled={busy} />
        <PasswordField id="signup-confirm" label="Confirm password" value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" disabled={busy} />

        {/* Bot trap: invisible to people and to screen readers, never filled in by a person. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="signup-contact-pref">Leave this empty</label>
          <input id="signup-contact-pref" name="contact_pref_url" type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="neo-button-primary flex w-full cursor-pointer items-center justify-center gap-2 px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          <span>Create account</span>
        </button>
      </form>
    </AccountShell>
  );
}

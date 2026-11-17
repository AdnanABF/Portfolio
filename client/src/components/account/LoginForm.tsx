"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Loader2, LogIn } from "lucide-react";
import { Alert, AccountShell } from "@/components/account/AccountShell";
import { PasswordField } from "@/components/account/PasswordField";
import { errorText } from "@/components/account/errors";
import { useAdmin, useFreshSession } from "@/components/admin/AdminContext";
import { FormField, inputClass } from "@/components/ui/FormField";
import { ApiError, apiLogin, resendVerification } from "@/lib/api-client";

/**
 * Only same-site paths are allowed as a return address, so a link cannot send someone to another site after login.
 * A backslash is refused too: browsers treat "/\\host" like "//host", which is another site.
 */
function safeReturnPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.startsWith("/login")) return null;
  return value;
}

/**
 * Where to go after signing in: back to the page they came from, but never into /admin for someone who is not an
 * admin (that page would send them straight back here). Otherwise admins land in the admin area, members on /account.
 */
function destinationFor(isAdmin: boolean, returnTo: string | null): string {
  if (returnTo && (isAdmin || !returnTo.startsWith("/admin"))) return returnTo;
  return isAdmin ? "/admin" : "/account";
}

/** The one sign-in page for everyone. */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { account, isAdmin, isLoading: authLoading, refreshAuth } = useAdmin();
  const sessionChecked = useFreshSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notVerified, setNotVerified] = useState(false);
  const [resent, setResent] = useState(false);

  const returnTo = safeReturnPath(searchParams.get("from"));

  // Someone who is already signed in has no use for the form. Wait until the server has confirmed it on this page:
  // a session that was revoked or expired must not send the visitor back to where they were just refused.
  useEffect(() => {
    if (sessionChecked && !authLoading && account) router.replace(destinationFor(isAdmin, returnTo));
  }, [sessionChecked, authLoading, account, isAdmin, returnTo, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    setNotVerified(false);
    setResent(false);
    try {
      const result = await apiLogin(email.trim(), password);
      await refreshAuth();
      const admin = result?.role === "Admin" || result?.role === "SuperAdmin";
      router.push(destinationFor(admin, returnTo));
    } catch (e) {
      setNotVerified(e instanceof ApiError && e.code === "email_not_verified");
      setError(errorText(e, "Sign-in failed. Please check your details and try again."));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await resendVerification(email.trim());
      setResent(true);
    } catch (e) {
      setError(errorText(e));
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

  return (
    <AccountShell
      icon={LogIn}
      eyebrow="WELCOME BACK"
      title="Sign in"
      footer={
        <div className="space-y-1.5">
          <p>
            New here?{" "}
            <Link href="/signup" className="font-bold text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert kind="error">{error}</Alert>}
        {notVerified && !resent && (
          <button type="button" onClick={resend} className="cursor-pointer font-mono text-xs font-bold text-primary hover:underline">
            Send the confirmation email again
          </button>
        )}
        {resent && <Alert kind="success">If this account still needs to confirm its email, a new link is on its way.</Alert>}

        <FormField label="Email or username" htmlFor="login-email">
          <input
            id="login-email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            required
            disabled={busy}
            className={inputClass}
          />
        </FormField>

        <PasswordField id="login-password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" disabled={busy} />

        <div className="text-right font-mono text-xs">
          <Link href="/forgot-password" className="text-muted hover:text-primary hover:underline">
            Forgot your password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={busy || !email.trim() || !password}
          className="neo-button-primary flex w-full cursor-pointer items-center justify-center gap-2 px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          <span>Sign in</span>
        </button>
      </form>
    </AccountShell>
  );
}

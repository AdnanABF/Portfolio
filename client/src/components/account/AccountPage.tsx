"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, LogOut, ShieldOff, UserRound } from "lucide-react";
import { SessionRow } from "@/components/account/SessionRow";
import { PASSWORD_HINT, PasswordField, passwordProblem } from "@/components/account/PasswordField";
import { errorText, fieldError } from "@/components/account/errors";
import { useAdmin } from "@/components/admin/AdminContext";
import { RoleBadge } from "@/components/admin/members/memberUi";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormField, inputClass } from "@/components/ui/FormField";
import { Notice, useNotice } from "@/components/ui/Notice";
import { apiLogout, changePassword, getMySessions, isUnauthorized, revokeAllMySessions, revokeMySession, updateProfile } from "@/lib/api-client";
import type { MemberRole, SessionItem } from "@/lib/types";

const card = "rounded-2xl border-3 border-line bg-surface p-5 shadow-[4px_4px_0px_var(--shadow-color)] sm:p-6";

/** The signed-in person's own page: name, password, and the devices they are signed in on. */
export function AccountPage() {
  const router = useRouter();
  const { account, isAdmin, isLoading, refreshAuth } = useAdmin();
  const { notice, show, dismiss } = useNotice();

  // Nobody signed in: go and sign in, and come back here.
  useEffect(() => {
    if (!isLoading && !account) router.replace(`/login?from=${encodeURIComponent("/account")}`);
  }, [isLoading, account, router]);

  if (isLoading || !account) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex items-center gap-2 font-mono text-xs text-muted">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading your account...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-16 px-4 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href={isAdmin ? "/admin" : "/"} className="mb-6 inline-flex items-center gap-1.5 font-mono text-xs font-bold text-muted hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{isAdmin ? "Back to Dashboard" : "Back to Portfolio"}</span>
        </Link>

        <div className="border-b-2 border-line pb-6">
          <span className="font-mono text-xs font-bold text-primary">{"// YOUR ACCOUNT"}</span>
          <h1 className="text-3xl font-extrabold text-foreground">{account.fullName || account.email}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
            <span>{account.email}</span>
            <RoleBadge role={(account.role as MemberRole) || "Member"} />
          </div>
        </div>

        <Notice notice={notice} onDismiss={dismiss} />

        <div className="mt-6 space-y-6">
          <ProfileCard initialName={account.fullName} onSaved={async () => {
            await refreshAuth();
            show("success", "Your name is saved.");
          }} onError={(text) => show("error", text)} />
          <PasswordCard onChanged={() => show("success", "Your password is changed. Other devices were signed out.")} />
          <SessionsCard
            onSignedOutEverywhere={async () => {
              await refreshAuth();
              router.replace("/login");
            }}
            onMessage={show}
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={async () => {
                await apiLogout();
                await refreshAuth();
                router.replace("/login");
              }}
              className="neo-button-secondary inline-flex cursor-pointer items-center gap-2 px-4 py-2 font-mono text-xs font-bold"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ initialName, onSaved, onError }: { initialName: string; onSaved: () => Promise<void>; onError: (text: string) => void }) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const dirty = name.trim() !== initialName.trim();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !dirty) return;
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    setBusy(true);
    setError(undefined);
    try {
      await updateProfile(name.trim());
      await onSaved();
    } catch (e) {
      setError(fieldError(e, "fullName"));
      onError(errorText(e, "Could not save your name."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={card} aria-labelledby="profile-title">
      <h2 id="profile-title" className="flex items-center gap-2 text-lg font-extrabold text-foreground">
        <UserRound className="h-5 w-5 text-primary" aria-hidden="true" /> Profile
      </h2>
      <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
        <FormField label="Full name" htmlFor="profile-name" error={error}>
          <input id="profile-name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" disabled={busy} className={inputClass} />
        </FormField>
        <button
          type="submit"
          disabled={busy || !dirty}
          className="neo-button-primary inline-flex cursor-pointer items-center gap-2 px-4 py-2 font-mono text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />} Save name
        </button>
      </form>
    </section>
  );
}

function PasswordCard({ onChanged }: { onChanged: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    const found = {
      current: current ? undefined : "Enter your current password.",
      next: passwordProblem(next),
      confirm: confirm !== next ? "The passwords do not match." : undefined,
    };
    setErrors(found);
    if (found.current || found.next || found.confirm) return;

    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      onChanged();
    } catch (e) {
      setErrors({ current: fieldError(e, "currentPassword"), next: fieldError(e, "newPassword") ?? (fieldError(e, "currentPassword") ? undefined : errorText(e)) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={card} aria-labelledby="password-title">
      <h2 id="password-title" className="flex items-center gap-2 text-lg font-extrabold text-foreground">
        <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" /> Change password
      </h2>
      <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
        <PasswordField id="current-password" label="Current password" value={current} onChange={setCurrent} error={errors.current} autoComplete="current-password" disabled={busy} />
        <PasswordField id="new-password" label="New password" value={next} onChange={setNext} error={errors.next} hint={PASSWORD_HINT} autoComplete="new-password" disabled={busy} />
        <PasswordField id="confirm-password" label="Confirm new password" value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" disabled={busy} />
        <button
          type="submit"
          disabled={busy}
          className="neo-button-primary inline-flex cursor-pointer items-center gap-2 px-4 py-2 font-mono text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />} Change password
        </button>
      </form>
    </section>
  );
}

function SessionsCard({
  onSignedOutEverywhere,
  onMessage,
}: {
  onSignedOutEverywhere: () => Promise<void>;
  onMessage: (kind: "success" | "error", text: string) => void;
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [loadedAt, setLoadedAt] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMySessions()
      .then((loaded) => {
        if (cancelled) return;
        setSessions(loaded);
        setFailed(false);
        setLoadedAt(Date.now());
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isUnauthorized(error)) router.replace(`/login?from=${encodeURIComponent("/account")}`);
        else setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reload, router]);

  const active = (sessions ?? []).filter((s) => !s.isRevoked && new Date(s.expiresAt).getTime() > loadedAt);

  return (
    <section className={card} aria-labelledby="sessions-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="sessions-title" className="text-lg font-extrabold text-foreground">
          Where you are signed in
        </h2>
        <button
          type="button"
          onClick={() => setConfirmAll(true)}
          disabled={active.length === 0}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-2 border-accent-coral/60 bg-surface px-3 py-1.5 font-mono text-xs font-bold text-accent-coral transition-colors hover:bg-accent-coral/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" /> Sign out everywhere
        </button>
      </div>

      <div className="mt-4">
        {failed ? (
          <p className="rounded-xl border-2 border-line bg-surface-2 p-4 text-center font-mono text-xs text-muted">Could not load your sessions.</p>
        ) : !sessions ? (
          <div className="flex items-center justify-center p-6 font-mono text-xs text-muted">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" aria-hidden="true" /> Loading...
          </div>
        ) : (
          <ul className="space-y-2">
            {active.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                nowMs={loadedAt}
                busy={busyId === session.id}
                revokeLabel="Sign out"
                onRevoke={async () => {
                  setBusyId(session.id);
                  try {
                    await revokeMySession(session.id);
                    onMessage("success", "That device is signed out.");
                    setReload((n) => n + 1);
                  } catch (e) {
                    onMessage("error", errorText(e, "Could not sign that device out."));
                  } finally {
                    setBusyId(null);
                  }
                }}
              />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmAll}
        title="Sign out everywhere?"
        message="Every device you are signed in on, including this one, is signed out. You will need to sign in again."
        confirmLabel="Sign out everywhere"
        tone="danger"
        busy={confirmBusy}
        onCancel={() => !confirmBusy && setConfirmAll(false)}
        onConfirm={async () => {
          setConfirmBusy(true);
          try {
            await revokeAllMySessions();
            await onSignedOutEverywhere();
          } catch (e) {
            setConfirmAll(false);
            onMessage("error", errorText(e, "Could not sign you out everywhere."));
          } finally {
            setConfirmBusy(false);
          }
        }}
      />
    </section>
  );
}

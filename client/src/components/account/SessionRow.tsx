"use client";

import { Loader2, Monitor } from "lucide-react";
import { formatDateTime, formatRelative } from "@/components/admin/members/memberUi";
import type { SessionItem } from "@/lib/types";

interface SessionRowProps {
  session: SessionItem;
  /** "Now" in milliseconds, taken when the data arrived so the relative times do not jump on every render. */
  nowMs: number;
  busy: boolean;
  onRevoke: () => void;
  revokeLabel?: string;
}

/** One signed-in device: what it is, where it is from, when it was last active, and a button to sign it out. */
export function SessionRow({ session, nowMs, busy, onRevoke, revokeLabel = "Revoke" }: SessionRowProps) {
  const ended = session.isRevoked || new Date(session.expiresAt).getTime() < nowMs;
  const state = session.isRevoked ? "Revoked" : ended ? "Expired" : session.isOnline ? "Online" : "Idle";

  return (
    <li className="flex flex-col gap-3 rounded-xl border-2 border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold text-foreground">{session.deviceInfo || "Unknown device"}</span>
            {session.isCurrent && (
              <span className="rounded-md border border-primary bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">This device</span>
            )}
            <span
              className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                state === "Online"
                  ? "border-accent-mint bg-accent-mint/15 text-foreground"
                  : state === "Idle"
                    ? "border-line bg-surface-2 text-muted"
                    : "border-accent-coral bg-accent-coral/10 text-accent-coral"
              }`}
            >
              {state}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-muted">
            {session.ipAddress || "no IP"} · {session.loginMethod} · active {formatRelative(session.lastActiveAt, nowMs)}
          </p>
          <p className="font-mono text-[10px] text-muted">Signed in {formatDateTime(session.createdAt)}</p>
        </div>
      </div>
      {!ended && !session.isCurrent && (
        <button
          type="button"
          onClick={onRevoke}
          disabled={busy}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-accent-coral/60 bg-surface px-3 py-1.5 font-mono text-xs font-bold text-accent-coral transition-colors hover:bg-accent-coral/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {revokeLabel}
        </button>
      )}
    </li>
  );
}

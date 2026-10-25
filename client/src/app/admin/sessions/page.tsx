"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Laptop, Loader2, Trash2 } from "lucide-react";
import { getAdminSessions, revokeSession } from "@/lib/api-client";

interface SessionItem {
  id: string;
  userId?: string;
  userEmail?: string;
  loginMethod?: string;
  ipAddress: string;
  deviceInfo?: string;
  createdAt: string;
  lastActiveAt: string;
  isOnline: boolean;
  isRevoked: boolean;
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSessions = async () => {
    const data = await getAdminSessions();
    setSessions(data);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    getAdminSessions().then((data) => {
      if (isMounted) {
        setSessions(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to terminate this session? The device will be logged out immediately.")) return;
    setActionLoading(id);
    try {
      await revokeSession(id);
      await fetchSessions();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-28 pb-16 px-4 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-muted hover:text-primary mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="border-b-2 border-line pb-6">
          <span className="font-mono text-xs font-bold text-accent-coral">{"// SECURITY & GOVERNANCE"}</span>
          <h1 className="text-3xl font-extrabold text-foreground">Active User & Device Sessions</h1>
          <p className="mt-1 text-sm text-muted">
            Inspect all connected browsers, IP addresses, and online status. Terminate unverified sessions with 1 click.
          </p>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-muted font-mono text-xs">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
              Loading active sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border-2 border-line bg-surface p-8 text-center font-mono text-xs text-muted">
              No sessions found.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border-2 border-line bg-surface p-4 shadow-[3px_3px_0px_var(--shadow-color)] gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-line bg-surface-2 text-primary shrink-0">
                      <Laptop className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm">{s.deviceInfo || "Web Browser"}</span>
                        {s.userEmail && (
                          <span className="font-mono text-xs text-primary font-bold">
                            ({s.userEmail})
                          </span>
                        )}
                        {s.loginMethod && (
                          <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted border border-line">
                            {s.loginMethod}
                          </span>
                        )}
                        {s.isOnline ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-accent-mint bg-accent-mint/20 px-2 py-0.5 font-mono text-[10px] font-bold text-accent-mint">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent-mint animate-pulse" />
                            Online
                          </span>
                        ) : (
                          <span className="rounded bg-cream px-1.5 py-0.5 font-mono text-[10px] text-muted border border-line">
                            Idle
                          </span>
                        )}
                        {s.isRevoked && (
                          <span className="rounded bg-accent-coral/20 px-1.5 py-0.5 font-mono text-[10px] text-accent-coral border border-accent-coral">
                            Revoked
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-muted mt-0.5">
                        IP: {s.ipAddress} • Last active: {new Date(s.lastActiveAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {!s.isRevoked && (
                      <button
                        onClick={() => handleRevoke(s.id)}
                        disabled={actionLoading === s.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border-2 border-line bg-accent-coral/10 px-3 py-1.5 font-mono text-xs font-bold text-accent-coral hover:bg-accent-coral hover:text-white transition-all cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading === s.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        <span>Revoke Device</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

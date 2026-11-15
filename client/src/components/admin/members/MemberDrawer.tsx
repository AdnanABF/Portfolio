"use client";

import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import {
  Ban,
  CircleCheck,
  Crown,
  History,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  RotateCcw,
  ShieldOff,
  Trash2,
  UserX,
} from "lucide-react";
import { SessionRow } from "@/components/account/SessionRow";
import { useAdmin } from "@/components/admin/AdminContext";
import { Pagination } from "@/components/admin/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import {
  ApiError,
  deleteMember,
  eraseMember,
  getMember,
  getMemberActivity,
  getMemberSessions,
  resendMemberInvite,
  restoreMember,
  revokeAllMemberSessions,
  revokeMemberSession,
  sendMemberPasswordReset,
  setMemberActive,
} from "@/lib/api-client";
import type { ActivityLogPage, MemberItem, SessionItem } from "@/lib/types";
import { Avatar, RoleBadge, StatusBadge, formatDateTime, lastLoginText, useAuthErrorHandler } from "./memberUi";

type Tab = "details" | "sessions" | "history";
type ConfirmKind = "deactivate" | "delete" | "erase" | "revoke-all" | "reset-password";

interface MemberDrawerProps {
  memberId: string;
  /** Changes whenever the page saved something that may have changed this member (the edit form). */
  refreshKey: number;
  onClose: () => void;
  onEdit: (member: MemberItem) => void;
  /** Tells the page something changed (so it reloads the list) and what to say about it. */
  onChanged: (kind: "success" | "error", text: string) => void;
}

const HISTORY_PAGE_SIZES = [10, 20];

/** Everything about one member: details, the actions that can be taken, their sessions and their history. */
export function MemberDrawer({ memberId, refreshKey, onClose, onEdit, onChanged }: MemberDrawerProps) {
  const handleAuthError = useAuthErrorHandler();
  const { account } = useAdmin();
  const tabsId = useId();

  // ---- the member ------------------------------------------------------------------------------
  const [member, setMember] = useState<MemberItem | null>(null);
  const [memberError, setMemberError] = useState<"missing" | "failed" | null>(null);
  const [memberReload, setMemberReload] = useState(0);
  const [loadedAt, setLoadedAt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMember(memberId)
      .then((loaded) => {
        if (cancelled) return;
        setMember(loaded);
        setMemberError(null);
        setLoadedAt(Date.now());
      })
      .catch((error: unknown) => {
        if (cancelled || handleAuthError(error)) return;
        setMemberError(error instanceof ApiError && error.status === 404 ? "missing" : "failed");
      });
    return () => {
      cancelled = true;
    };
  }, [memberId, refreshKey, memberReload, handleAuthError]);

  const reloadMember = () => setMemberReload((n) => n + 1);

  // Looking at your own row: the session you are using is listed, and "revoke all" keeps it.
  const isOwnRow = Boolean(member && account && member.id === account.id);

  // ---- tabs ------------------------------------------------------------------------------------
  const [tab, setTab] = useState<Tab>("details");

  // Sessions
  const [includeEnded, setIncludeEnded] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[] | null>(null);
  const [sessionsError, setSessionsError] = useState(false);
  const [sessionsReload, setSessionsReload] = useState(0);

  useEffect(() => {
    if (tab !== "sessions") return;
    let cancelled = false;
    getMemberSessions(memberId, includeEnded)
      .then((loaded) => {
        if (cancelled) return;
        setSessions(loaded);
        setSessionsError(false);
        setLoadedAt(Date.now());
      })
      .catch((error: unknown) => {
        if (cancelled || handleAuthError(error)) return;
        setSessionsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, memberId, includeEnded, sessionsReload, refreshKey, handleAuthError]);

  // History
  const [historyPage, setHistoryPage] = useState(1);
  const [historySize, setHistorySize] = useState(10);
  const [history, setHistory] = useState<ActivityLogPage | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [historyReload, setHistoryReload] = useState(0);

  useEffect(() => {
    if (tab !== "history") return;
    let cancelled = false;
    getMemberActivity(memberId, { page: historyPage, pageSize: historySize })
      .then((loaded) => {
        if (cancelled) return;
        setHistory(loaded);
        setHistoryError(false);
      })
      .catch((error: unknown) => {
        if (cancelled || handleAuthError(error)) return;
        setHistoryError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, memberId, historyPage, historySize, historyReload, refreshKey, handleAuthError]);

  // ---- actions ---------------------------------------------------------------------------------
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [directBusy, setDirectBusy] = useState<string | null>(null);

  const closeConfirm = () => {
    if (confirmBusy) return;
    setConfirm(null);
    setConfirmError(null);
  };

  const failureText = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback);

  /** Actions that need no question because they are easy to undo. */
  const runDirect = async (key: string, action: () => Promise<string>, failure: string) => {
    setDirectBusy(key);
    try {
      const text = await action();
      reloadMember();
      setSessionsReload((n) => n + 1);
      setHistoryReload((n) => n + 1);
      onChanged("success", text);
    } catch (error) {
      if (!handleAuthError(error)) onChanged("error", failureText(error, failure));
    } finally {
      setDirectBusy(null);
    }
  };

  const runConfirmed = async () => {
    if (!member || !confirm) return;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      let text = "";
      switch (confirm) {
        case "deactivate":
          await setMemberActive(member.id, false);
          text = `${member.fullName} is deactivated and signed out everywhere.`;
          break;
        case "delete":
          await deleteMember(member.id);
          text = `${member.fullName} is deleted. They can be restored from the Deleted filter.`;
          break;
        case "erase":
          await eraseMember(member.id, member.email);
          onChanged("success", `${member.fullName} was erased permanently and their log entries were anonymized.`);
          onClose();
          return;
        case "revoke-all":
          await revokeAllMemberSessions(member.id);
          text = isOwnRow ? "All your other devices are signed out." : `All sessions of ${member.fullName} are revoked.`;
          break;
        case "reset-password": {
          const result = await sendMemberPasswordReset(member.id);
          text = result.emailSent
            ? `A password reset link was sent to ${member.email}.`
            : `The reset email to ${member.email} could not be sent. Check the email settings.`;
          break;
        }
      }
      setConfirm(null);
      reloadMember();
      setSessionsReload((n) => n + 1);
      setHistoryReload((n) => n + 1);
      onChanged("success", text);
    } catch (error) {
      if (!handleAuthError(error)) setConfirmError(failureText(error, "That did not work. Please try again."));
    } finally {
      setConfirmBusy(false);
    }
  };

  const confirmCopy = (): { title: string; message: ReactNode; label: string; danger: boolean; requireText?: string } | null => {
    if (!member || !confirm) return null;
    switch (confirm) {
      case "deactivate":
        return {
          title: "Deactivate this member?",
          message: <>{member.fullName} will be signed out everywhere and cannot sign in until you activate them again.</>,
          label: "Deactivate",
          danger: true,
        };
      case "delete":
        return {
          title: "Delete this member?",
          message: <>{member.fullName} is hidden, signed out and cannot sign in. Their record is kept, so you can restore them later.</>,
          label: "Delete",
          danger: true,
        };
      case "erase":
        return {
          title: "Erase permanently?",
          message: (
            <>
              This removes {member.fullName} for good, including their sign-in details, and replaces their name, email, IP address and device in the activity log with
              &quot;erased user&quot;. <strong>This cannot be undone.</strong>
            </>
          ),
          label: "Erase permanently",
          danger: true,
          requireText: member.email,
        };
      case "revoke-all":
        return isOwnRow
          ? {
              title: "Sign out your other devices?",
              message: <>Every device you are signed in on, except this one, is signed out. You stay signed in here.</>,
              label: "Revoke all others",
              danger: true,
            }
          : {
              title: "Revoke all sessions?",
              message: <>{member.fullName} is signed out on every device. They can sign in again.</>,
              label: "Revoke all",
              danger: true,
            };
      case "reset-password":
        return {
          title: "Send a password reset link?",
          message: <>An email with a link to choose a new password is sent to {member.email}. Their current password keeps working until they use it.</>,
          label: "Send link",
          danger: false,
        };
    }
  };

  const copy = confirmCopy();

  // ---- render ----------------------------------------------------------------------------------
  const isOwner = Boolean(member?.isSuperAdmin);
  const isDeleted = member?.status === "deleted";

  return (
    <>
      <Modal open onClose={onClose} placement="right" title={member?.fullName ?? "Member"} description={member?.email}>
        {memberError === "missing" && <State text="This member no longer exists." />}
        {memberError === "failed" && !member && <State text="Could not load this member." />}
        {!member && !memberError && (
          <div className="flex items-center justify-center p-10 font-mono text-xs text-muted">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" aria-hidden="true" /> Loading member...
          </div>
        )}

        {member && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={member.fullName} email={member.email} size="lg" />
              <div className="flex flex-wrap items-center gap-2">
                <RoleBadge role={member.role} />
                <StatusBadge status={member.status} />
              </div>
            </div>

            {/* Actions */}
            {isOwner ? (
              <p className="flex items-start gap-2 rounded-xl border-2 border-accent-violet bg-accent-violet/10 p-3 font-mono text-xs text-foreground">
                <Crown className="mt-0.5 h-4 w-4 shrink-0 text-accent-violet" aria-hidden="true" />
                This is the owner account. It cannot be edited, deactivated, deleted or demoted here.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {!isDeleted && (
                  <>
                    <ActionButton icon={Pencil} label="Edit" onClick={() => onEdit(member)} />
                    {member.status === "inactive" ? (
                      <ActionButton
                        icon={CircleCheck}
                        label="Activate"
                        busy={directBusy === "activate"}
                        onClick={() => runDirect("activate", async () => {
                          await setMemberActive(member.id, true);
                          return `${member.fullName} is active again.`;
                        }, "Could not activate the member.")}
                      />
                    ) : (
                      <ActionButton icon={Ban} label="Deactivate" onClick={() => setConfirm("deactivate")} />
                    )}
                    {member.status === "pending" && (
                      <ActionButton
                        icon={Mail}
                        label="Resend invite"
                        busy={directBusy === "invite"}
                        onClick={() => runDirect("invite", async () => {
                          const result = await resendMemberInvite(member.id);
                          return result.emailSent
                            ? `The email was sent again to ${member.email}.`
                            : `The email to ${member.email} could not be sent. Check the email settings.`;
                        }, "Could not send the email.")}
                      />
                    )}
                    {member.status !== "pending" && <ActionButton icon={KeyRound} label="Reset password" onClick={() => setConfirm("reset-password")} />}
                    <ActionButton icon={Trash2} label="Delete" tone="danger" onClick={() => setConfirm("delete")} />
                  </>
                )}
                {isDeleted && (
                  <ActionButton
                    icon={RotateCcw}
                    label="Restore"
                    busy={directBusy === "restore"}
                    onClick={() => runDirect("restore", async () => {
                      await restoreMember(member.id);
                      return `${member.fullName} is restored and active.`;
                    }, "Could not restore the member.")}
                  />
                )}
                <ActionButton icon={UserX} label="Erase permanently" tone="danger" onClick={() => setConfirm("erase")} />
              </div>
            )}

            {/* Tabs */}
            <div
              role="tablist"
              aria-label="Member sections"
              className="flex gap-1 border-b-2 border-line"
              onKeyDown={(event) => {
                // Left and Right move between the tabs, Home and End jump to the first and last.
                const order: Tab[] = ["details", "sessions", "history"];
                const at = order.indexOf(tab);
                const next =
                  event.key === "ArrowRight" ? order[(at + 1) % order.length]
                  : event.key === "ArrowLeft" ? order[(at + order.length - 1) % order.length]
                  : event.key === "Home" ? order[0]
                  : event.key === "End" ? order[order.length - 1]
                  : null;
                if (!next) return;
                event.preventDefault();
                setTab(next);
                document.getElementById(`${tabsId}-tab-${next}`)?.focus();
              }}
            >
              {(["details", "sessions", "history"] as Tab[]).map((id) => (
                <button
                  key={id}
                  id={`${tabsId}-tab-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  aria-controls={`${tabsId}-panel`}
                  tabIndex={tab === id ? 0 : -1}
                  onClick={() => setTab(id)}
                  className={`-mb-0.5 cursor-pointer border-b-2 px-3 py-2 font-mono text-xs font-bold capitalize transition-colors ${
                    tab === id ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {id}
                  {id === "sessions" && <span className="ml-1.5 rounded bg-surface-2 px-1.5 text-[10px]">{member.activeSessions}</span>}
                </button>
              ))}
            </div>

            <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-tab-${tab}`}>
              {tab === "details" && <DetailsTab member={member} nowMs={loadedAt} />}

              {tab === "sessions" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-foreground">
                      <input type="checkbox" checked={includeEnded} onChange={(e) => setIncludeEnded(e.target.checked)} className="h-4 w-4 accent-primary" />
                      Show ended sessions
                    </label>
                    <ActionButton
                      icon={ShieldOff}
                      label={isOwnRow ? "Revoke all others" : "Revoke all"}
                      tone="danger"
                      disabled={!sessions || sessions.every((s) => s.isRevoked || s.isCurrent)}
                      onClick={() => setConfirm("revoke-all")}
                    />
                  </div>

                  {sessionsError ? (
                    <State text="Could not load the sessions." />
                  ) : !sessions ? (
                    <Loading text="Loading sessions..." />
                  ) : sessions.length === 0 ? (
                    <State text={includeEnded ? "No sessions yet." : "Not signed in anywhere right now."} />
                  ) : (
                    <ul className="space-y-2">
                      {sessions.map((session) => (
                        <SessionRow
                          key={session.id}
                          session={session}
                          nowMs={loadedAt}
                          busy={directBusy === `session-${session.id}`}
                          onRevoke={() => runDirect(`session-${session.id}`, async () => {
                            await revokeMemberSession(member.id, session.id);
                            return "The session is revoked.";
                          }, "Could not revoke the session.")}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {tab === "history" && (
                <div>
                  {historyError ? (
                    <State text="Could not load the history." />
                  ) : !history ? (
                    <Loading text="Loading history..." />
                  ) : history.items.length === 0 ? (
                    <State text="Nothing recorded for this member yet." />
                  ) : (
                    <>
                      <ul className="space-y-2">
                        {history.items.map((entry) => (
                          <li key={entry.id} className="rounded-xl border-2 border-line bg-surface p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                                <History className="h-3 w-3" aria-hidden="true" />
                                {entry.action}
                              </span>
                              <span className="font-mono text-[10px] text-muted">{formatDateTime(entry.timestamp)}</span>
                            </div>
                            <p className="mt-1.5 text-sm text-foreground">{entry.summary}</p>
                            <p className="mt-1 font-mono text-[10px] text-muted">
                              {entry.ipAddress || "no IP"}
                              {entry.deviceInfo ? ` · ${entry.deviceInfo}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                      <Pagination
                        totalItems={history.totalCount}
                        page={historyPage}
                        pageSize={historySize}
                        pageSizeOptions={HISTORY_PAGE_SIZES}
                        sizeLabel="Entries per page"
                        onPageChange={setHistoryPage}
                        onPageSizeChange={(size) => {
                          setHistorySize(size);
                          setHistoryPage(1);
                        }}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(copy)}
        title={copy?.title ?? ""}
        message={copy?.message}
        confirmLabel={copy?.label ?? "Confirm"}
        tone={copy?.danger ? "danger" : "default"}
        requireText={copy?.requireText}
        busy={confirmBusy}
        error={confirmError}
        onConfirm={runConfirmed}
        onCancel={closeConfirm}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function State({ text }: { text: string }) {
  return <p className="rounded-xl border-2 border-line bg-surface-2 p-4 text-center font-mono text-xs text-muted">{text}</p>;
}

function Loading({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center p-8 font-mono text-xs text-muted">
      <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" aria-hidden="true" /> {text}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  tone = "default",
  busy = false,
  disabled = false,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 font-mono text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        tone === "danger"
          ? "border-accent-coral/60 bg-surface text-accent-coral hover:bg-accent-coral/10"
          : "border-line bg-surface text-foreground hover:bg-cream"
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {label}
    </button>
  );
}

function DetailsTab({ member, nowMs }: { member: MemberItem; nowMs: number }) {
  const rows: [string, ReactNode][] = [
    ["Name", member.fullName],
    ["Email / username", member.email],
    ["Email confirmed", member.emailConfirmed ? "Yes" : "Not yet"],
    ["Joined", formatDateTime(member.createdAt)],
    ["Last signed in", member.lastLoginAt ? `${formatDateTime(member.lastLoginAt)} (${lastLoginText(member, nowMs)})` : "Never"],
    ["Last IP address", member.lastLoginIp || "—"],
    ["Signed in now", `${member.activeSessions} ${member.activeSessions === 1 ? "session" : "sessions"}`],
  ];
  if (member.deletedAt) rows.push(["Deleted", formatDateTime(member.deletedAt)]);

  return (
    <dl className="divide-y divide-line/60 rounded-xl border-2 border-line bg-surface">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
          <dt className="w-40 shrink-0 font-mono text-[11px] font-bold text-muted">{label}</dt>
          <dd className="break-all text-sm text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

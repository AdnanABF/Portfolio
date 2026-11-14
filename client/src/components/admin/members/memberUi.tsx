"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";
import { isUnauthorized } from "@/lib/api-client";
import type { MemberItem, MemberRole, MemberStatus } from "@/lib/types";

export const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "SuperAdmin", label: "SuperAdmin" },
  { value: "Admin", label: "Admin" },
  { value: "Member", label: "Member" },
];

export const STATUS_OPTIONS = [
  { value: "", label: "All (not deleted)" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "inactive", label: "Inactive" },
  { value: "deleted", label: "Deleted" },
];

const STATUS_STYLE: Record<MemberStatus, string> = {
  active: "border-accent-mint bg-accent-mint/15 text-foreground",
  pending: "border-accent-yellow bg-accent-yellow/20 text-foreground",
  inactive: "border-line bg-surface-2 text-muted",
  deleted: "border-accent-coral bg-accent-coral/10 text-accent-coral",
};

const STATUS_LABEL: Record<MemberStatus, string> = {
  active: "Active",
  pending: "Pending",
  inactive: "Inactive",
  deleted: "Deleted",
};

export function StatusBadge({ status }: { status: MemberStatus }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${STATUS_STYLE[status] ?? STATUS_STYLE.inactive}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function RoleBadge({ role }: { role: MemberRole }) {
  const style =
    role === "SuperAdmin"
      ? "border-accent-violet bg-accent-violet/15 text-accent-violet"
      : role === "Admin"
        ? "border-primary bg-primary/10 text-primary"
        : "border-line bg-surface-2 text-muted";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${style}`}>
      {role === "SuperAdmin" && <Crown className="h-3 w-3" aria-hidden="true" />}
      {role}
    </span>
  );
}

export function Avatar({ name, email, size = "md" }: { name: string; email: string; size?: "md" | "lg" }) {
  const initials = (name || email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-xl border-2 border-line bg-primary/15 font-mono font-extrabold text-primary shadow-[2px_2px_0px_var(--shadow-color)] ${
        size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-xs"
      }`}
    >
      {initials || "?"}
    </div>
  );
}

/** "5m ago", "3h ago", "2d ago", then a short date. */
export function formatRelative(iso: string, nowMs: number): string {
  const then = new Date(iso);
  const minutes = Math.round((nowMs - then.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const sameYear = then.getFullYear() === new Date(nowMs).getFullYear();
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

/** What the list shows for the last sign-in: when, and how. */
export function lastLoginText(member: Pick<MemberItem, "lastLoginAt" | "lastLoginMethod">, nowMs: number): string {
  if (!member.lastLoginAt) return "Never signed in";
  const when = formatRelative(member.lastLoginAt, nowMs);
  return member.lastLoginMethod ? `${when} · ${member.lastLoginMethod}` : when;
}

/** When an action fails because the sign-in ran out, goes to the login page and comes back here afterwards. */
export function useAuthErrorHandler() {
  const router = useRouter();
  return useCallback(
    (error: unknown): boolean => {
      if (!isUnauthorized(error)) return false;
      router.replace(`/login?from=${encodeURIComponent("/admin/members")}`);
      return true;
    },
    [router],
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Edit3,
  Inbox,
  LayoutDashboard,
  Lock,
  LogOut,
  ShieldCheck,
  Terminal,
  Users,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { apiLogout } from "@/lib/api-client";

export function UserMenu() {
  const { isAdmin, user, isLoading, isEditMode, toggleEditMode, refreshAuth } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setIsOpen(false);
    await apiLogout();
    await refreshAuth();
    router.push("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-line bg-surface/50 opacity-40">
        <Lock size={16} className="text-muted" />
      </div>
    );
  }

  // Not logged in: show lock button linking to admin login
  if (!isAdmin || !user) {
    return (
      <Link
        href="/admin/login"
        aria-label="Admin Portal"
        title="Admin Portal"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-line bg-surface text-foreground shadow-[2px_2px_0px_var(--shadow-color)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_var(--shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_var(--shadow-color)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer hover:text-primary"
      >
        <Lock size={17} />
      </Link>
    );
  }

  // Logged in user: initials
  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="User account menu"
        title={user.fullName || user.email}
        className="group relative inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-primary bg-primary/10 font-mono text-xs font-black text-primary shadow-[2px_2px_0px_var(--shadow-color)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:bg-primary hover:text-white hover:shadow-[3px_3px_0px_var(--shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_var(--shadow-color)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
      >
        <span>{initials}</span>
        {/* Online indicator dot */}
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent-mint" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border-2 border-line bg-surface p-2 shadow-[6px_6px_0px_var(--shadow-color)] backdrop-blur-md">
          {/* User Header */}
          <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-line bg-primary font-mono text-sm font-extrabold text-white shadow-[1.5px_1.5px_0px_var(--shadow-color)]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-sm text-foreground">
                {user.fullName || "Admin"}
              </div>
              <div className="truncate font-mono text-[11px] text-muted">
                {user.email}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                <ShieldCheck className="h-3 w-3" />
                <span>{user.role || "Admin"}</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="mt-2 space-y-0.5">
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-mono text-xs font-semibold text-foreground transition-colors hover:bg-cream hover:text-primary"
            >
              <LayoutDashboard className="h-4 w-4 text-primary" />
              <span>Dashboard Overview</span>
            </Link>

            <Link
              href="/admin/sessions"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-mono text-xs font-semibold text-foreground transition-colors hover:bg-cream hover:text-primary"
            >
              <Users className="h-4 w-4 text-accent-coral" />
              <span>Active Sessions</span>
            </Link>

            <Link
              href="/admin/activity"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-mono text-xs font-semibold text-foreground transition-colors hover:bg-cream hover:text-primary"
            >
              <Activity className="h-4 w-4 text-accent-mint" />
              <span>Activity Log</span>
            </Link>

            <Link
              href="/admin/inbox"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-mono text-xs font-semibold text-foreground transition-colors hover:bg-cream hover:text-primary"
            >
              <Inbox className="h-4 w-4 text-accent-yellow" />
              <span>Contact Inquiries</span>
            </Link>

            <Link
              href="/admin/system-logs"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-mono text-xs font-semibold text-foreground transition-colors hover:bg-cream hover:text-primary"
            >
              <Terminal className="h-4 w-4 text-muted" />
              <span>System Logs</span>
            </Link>
          </div>

          {/* Divider */}
          <div className="my-1.5 border-b border-line" />

          {/* Live Card Editing Toggle */}
          <button
            type="button"
            onClick={() => {
              toggleEditMode();
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 font-mono text-xs font-semibold text-foreground transition-colors hover:bg-cream cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Edit3 className="h-4 w-4 text-primary" />
              <span>Live Card Editing</span>
            </div>
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                isEditMode
                  ? "border-accent-mint bg-accent-mint text-neutral-950 shadow-[1px_1px_0px_var(--shadow-color)]"
                  : "border-line bg-surface-2 text-muted"
              }`}
            >
              {isEditMode ? "ON" : "OFF"}
            </span>
          </button>

          {/* Divider */}
          <div className="my-1.5 border-b border-line" />

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-mono text-xs font-bold text-accent-coral transition-colors hover:bg-accent-coral/10 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

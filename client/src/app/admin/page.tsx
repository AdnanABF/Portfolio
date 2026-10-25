"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Download,
  Eye,
  FolderGit2,
  Inbox,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";
import { apiLogout, getAdminAnalytics, getMe } from "@/lib/api-client";

interface AdminUserData {
  fullName?: string;
  email?: string;
}

interface AnalyticsData {
  totalPageViews?: number;
  totalCvDownloads?: number;
  totalInquiries?: number;
  activeSessionsCount?: number;
}

export default function AdminDashboardPage() {
  const [user, setUser] = useState<AdminUserData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    getMe().then((data) => {
      if (!isMounted) return;
      if (!data) router.push("/admin/login");
      else setUser(data);
    });

    getAdminAnalytics().then((data) => {
      if (isMounted) setAnalytics(data);
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await apiLogout();
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background pt-28 pb-16 px-4 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="border-b-2 border-line pb-6">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-primary">
            <ShieldCheck className="h-4 w-4" />
            <span>SUPER ADMIN CMS & OBSERVABILITY</span>
          </div>
          <h1 className="mt-1 text-3xl font-extrabold text-foreground">
            Welcome back, {user?.fullName || "Adnan"}
          </h1>
        </div>

        {/* Metrics Grid */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border-3 border-line bg-surface p-5 shadow-[4px_4px_0px_var(--shadow-color)]">
            <div className="flex items-center justify-between text-muted">
              <span className="font-mono text-xs font-bold">TOTAL VISITS</span>
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-foreground">
              {analytics?.totalPageViews ?? "—"}
            </div>
          </div>

          <div className="rounded-2xl border-3 border-line bg-surface p-5 shadow-[4px_4px_0px_var(--shadow-color)]">
            <div className="flex items-center justify-between text-muted">
              <span className="font-mono text-xs font-bold">CV DOWNLOADS</span>
              <Download className="h-4 w-4 text-secondary" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-foreground">
              {analytics?.totalCvDownloads ?? "—"}
            </div>
          </div>

          <div className="rounded-2xl border-3 border-line bg-surface p-5 shadow-[4px_4px_0px_var(--shadow-color)]">
            <div className="flex items-center justify-between text-muted">
              <span className="font-mono text-xs font-bold">INBOX LEADS</span>
              <Inbox className="h-4 w-4 text-accent-yellow" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-foreground">
              {analytics?.totalInquiries ?? "—"}
            </div>
          </div>

          <div className="rounded-2xl border-3 border-line bg-surface p-5 shadow-[4px_4px_0px_var(--shadow-color)]">
            <div className="flex items-center justify-between text-muted">
              <span className="font-mono text-xs font-bold">ACTIVE SESSIONS</span>
              <Users className="h-4 w-4 text-accent-coral" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-foreground">
              {analytics?.activeSessionsCount ?? "1"}
            </div>
          </div>
        </div>

        {/* Quick Navigation Panels */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Panel 1: In-Context Live Editing */}
          <div className="rounded-2xl border-3 border-line bg-surface p-6 shadow-[4px_4px_0px_var(--shadow-color)] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold">
                <FolderGit2 className="h-4 w-4" />
                <span>IN-CONTEXT EDITING</span>
              </div>
              <h3 className="mt-2 text-xl font-bold text-foreground">Public Website Content</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Edit your projects, experience timeline, bio, and upload new CV/photos directly on the public website with live re-rendering.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/#projects"
                className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 font-mono text-xs font-bold text-foreground hover:bg-cream transition-all"
              >
                Projects →
              </Link>
              <Link
                href="/#experience"
                className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 font-mono text-xs font-bold text-foreground hover:bg-cream transition-all"
              >
                Experience →
              </Link>
              <Link
                href="/#skills"
                className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 font-mono text-xs font-bold text-foreground hover:bg-cream transition-all"
              >
                Skills →
              </Link>
            </div>
          </div>

          {/* Panel 2: Sessions & Security */}
          <div className="rounded-2xl border-3 border-line bg-surface p-6 shadow-[4px_4px_0px_var(--shadow-color)] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-accent-coral font-mono text-xs font-bold">
                <Users className="h-4 w-4" />
                <span>GOVERNANCE</span>
              </div>
              <h3 className="mt-2 text-xl font-bold text-foreground">User & Device Sessions</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                View connected devices, IP addresses, browser info, live online indicators, and terminate active sessions remotely.
              </p>
            </div>
            <Link
              href="/admin/sessions"
              className="mt-6 flex items-center justify-between rounded-xl border-2 border-line bg-surface-2 px-4 py-2.5 font-mono text-xs font-bold text-foreground shadow-[2px_2px_0px_var(--shadow-color)] hover:-translate-y-0.5 transition-all"
            >
              <span>Manage Sessions</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Panel 3: Observability & Logs */}
          <div className="rounded-2xl border-3 border-line bg-surface p-6 shadow-[4px_4px_0px_var(--shadow-color)] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-secondary font-mono text-xs font-bold">
                <Activity className="h-4 w-4" />
                <span>OBSERVABILITY</span>
              </div>
              <h3 className="mt-2 text-xl font-bold text-foreground">Activity & System Logs</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Inspect audit trail records of recent changes and monitor real-time Serilog exception logs stored in PostgreSQL.
              </p>
            </div>
            <div className="mt-6 flex gap-2">
              <Link
                href="/admin/activity"
                className="flex-1 flex items-center justify-center gap-1 rounded-xl border-2 border-line bg-surface-2 py-2 font-mono text-xs font-bold text-foreground hover:bg-cream"
              >
                <span>Activity</span>
              </Link>
              <Link
                href="/admin/system-logs"
                className="flex-1 flex items-center justify-center gap-1 rounded-xl border-2 border-line bg-surface-2 py-2 font-mono text-xs font-bold text-foreground hover:bg-cream"
              >
                <AlertTriangle className="h-3 w-3 text-accent-coral" />
                <span>Errors</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Contact Leads Quick Box */}
        <div className="mt-8 rounded-2xl border-3 border-line bg-surface p-6 shadow-[4px_4px_0px_var(--shadow-color)] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-line bg-surface-2 text-accent-yellow">
              <Inbox className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-foreground">Contact Inquiries Inbox</h4>
              <p className="font-mono text-xs text-muted">Review, star, and reply to client inquiries.</p>
            </div>
          </div>
          <Link
            href="/admin/inbox"
            className="rounded-xl border-2 border-line bg-surface-2 px-4 py-2 font-mono text-xs font-bold text-foreground hover:bg-cream shadow-[2px_2px_0px_var(--shadow-color)]"
          >
            Open Inbox →
          </Link>
        </div>
      </div>
    </div>
  );
}

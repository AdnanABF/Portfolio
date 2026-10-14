"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, History, Loader2, RefreshCw, Search } from "lucide-react";
import { getAdminActivity } from "@/lib/api-client";

interface ActivityLogItem {
  id: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  detailsJson?: string;
  ipAddress?: string;
  deviceInfo?: string;
  timestamp: string;
}

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const refreshLogs = async () => {
    setLoading(true);
    const token = localStorage.getItem("abf_admin_token") || "";
    const data = await getAdminActivity(token);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem("abf_admin_token") || "";
    getAdminActivity(token).then((data) => {
      if (isMounted) {
        setLogs(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entityType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-muted hover:text-primary mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-2 border-line pb-6 gap-4">
          <div>
            <span className="font-mono text-xs font-bold text-accent-violet">{"// AUDIT TRAIL"}</span>
            <h1 className="text-3xl font-extrabold text-foreground">Activity & Mutation Logs</h1>
            <p className="mt-1 text-sm text-muted">
              Complete chronological audit trail of all content edits, setting updates, logins, and revocations.
            </p>
          </div>
          <button
            onClick={refreshLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-line bg-surface px-4 py-2 font-mono text-xs font-bold shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-y-[-1px] transition-all self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className="mt-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Filter by action, entity, user, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border-2 border-line bg-surface pl-10 pr-4 py-2 text-xs font-mono placeholder:text-muted focus:outline-none focus:border-primary"
            />
          </div>
          <div className="font-mono text-xs text-muted">
            {filteredLogs.length} events
          </div>
        </div>

        {/* Logs Feed */}
        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-muted font-mono text-xs">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
              Loading activity logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-2xl border-2 border-line bg-surface p-8 text-center font-mono text-xs text-muted">
              No matching activity logs found.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const isAuth = log.action.includes("LOGIN") || log.action.includes("SESSION");
                const isDelete = log.action.includes("DELETE") || log.action.includes("REVOKE");
                const isUpdate = log.action.includes("UPDATE") || log.action.includes("STATUS");

                let badgeColor = "border-primary bg-primary/10 text-primary";
                if (isAuth) badgeColor = "border-accent-mint bg-accent-mint/15 text-accent-mint";
                if (isDelete) badgeColor = "border-accent-coral bg-accent-coral/15 text-accent-coral";
                if (isUpdate) badgeColor = "border-accent-violet bg-accent-violet/15 text-accent-violet";

                return (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-start justify-between rounded-xl border-2 border-line bg-surface p-4 shadow-[3px_3px_0px_var(--shadow-color)] gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-line bg-surface-2 text-muted shrink-0 mt-0.5">
                        <History className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${badgeColor}`}
                          >
                            {log.action}
                          </span>
                          <span className="font-mono text-xs font-bold text-foreground">
                            {log.entityType} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ""}
                          </span>
                          <span className="font-mono text-[11px] text-muted">by {log.userEmail || "System"}</span>
                        </div>
                        <p className="mt-1 text-sm text-foreground">{log.summary}</p>
                        <div className="mt-1 font-mono text-[10px] text-muted flex flex-wrap gap-2">
                          <span>IP: {log.ipAddress || "local"}</span>
                          {log.deviceInfo && <span>• {log.deviceInfo}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono text-[10px] text-muted sm:text-right shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

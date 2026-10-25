"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  RefreshCw,
  Terminal,
  XCircle,
} from "lucide-react";
import { getAdminSystemLogs } from "@/lib/api-client";

interface SystemLogItem {
  id: string;
  level: string;
  message: string;
  exception?: string;
  stackTrace?: string;
  path?: string;
  httpMethod?: string;
  statusCode?: number;
  ipAddress?: string;
  timestamp: string;
}

export default function AdminSystemLogsPage() {
  const [logs, setLogs] = useState<SystemLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refreshLogs = async () => {
    setLoading(true);
    const data = await getAdminSystemLogs();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    getAdminSystemLogs().then((data) => {
      if (isMounted) {
        setLogs(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (filterLevel === "all") return true;
    return l.level?.toLowerCase() === filterLevel.toLowerCase();
  });

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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-2 border-line pb-6 gap-4">
          <div>
            <span className="font-mono text-xs font-bold text-accent-coral">{"// SYSTEM TELEMETRY"}</span>
            <h1 className="text-3xl font-extrabold text-foreground">Backend & Exception Logs</h1>
            <p className="mt-1 text-sm text-muted">
              Live Serilog exception telemetry, HTTP status codes, and stack traces recorded directly in PostgreSQL.
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

        {/* Level Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {["all", "Error", "Warning", "Information"].map((level) => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`rounded-lg border-2 border-line px-3 py-1 font-mono text-xs font-bold transition-all cursor-pointer ${
                filterLevel === level
                  ? "bg-primary text-black shadow-[2px_2px_0px_var(--shadow-color)]"
                  : "bg-surface text-muted hover:text-foreground"
              }`}
            >
              {level.toUpperCase()}
            </button>
          ))}
          <div className="ml-auto font-mono text-xs text-muted">
            {filteredLogs.length} entries
          </div>
        </div>

        {/* Logs List */}
        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-muted font-mono text-xs">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
              Loading system logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-2xl border-2 border-line bg-surface p-8 text-center font-mono text-xs text-muted">
              No system logs found for this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const isError = log.level?.toLowerCase() === "error" || (log.statusCode && log.statusCode >= 500);
                const isWarn = log.level?.toLowerCase() === "warning" || (log.statusCode && log.statusCode >= 400 && log.statusCode < 500);
                const isExpanded = expandedId === log.id;

                return (
                  <div
                    key={log.id}
                    className="rounded-xl border-2 border-line bg-surface overflow-hidden shadow-[3px_3px_0px_var(--shadow-color)]"
                  >
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 cursor-pointer hover:bg-surface-2/40 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 border-line shrink-0 mt-0.5 ${
                            isError
                              ? "bg-accent-coral/20 text-accent-coral"
                              : isWarn
                              ? "bg-amber-400/20 text-amber-500"
                              : "bg-primary/20 text-primary"
                          }`}
                        >
                          {isError ? (
                            <XCircle className="h-4 w-4" />
                          ) : isWarn ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Info className="h-4 w-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                isError
                                  ? "border-accent-coral text-accent-coral"
                                  : isWarn
                                  ? "border-amber-400 text-amber-500"
                                  : "border-primary text-primary"
                              }`}
                            >
                              {log.level || "INFO"}
                            </span>
                            {log.httpMethod && (
                              <span className="font-mono text-[10px] font-bold text-foreground">
                                {log.httpMethod} {log.path}
                              </span>
                            )}
                            {log.statusCode && (
                              <span className="font-mono text-[10px] text-muted">
                                [{log.statusCode}]
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs font-mono font-medium text-foreground break-all">
                            {log.message}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:self-center shrink-0">
                        <span className="font-mono text-[10px] text-muted">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        {log.stackTrace && (
                          <button
                            type="button"
                            className="text-muted hover:text-foreground cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && log.stackTrace && (
                      <div className="border-t-2 border-line bg-black p-4 font-mono text-[11px] text-accent-mint overflow-x-auto">
                        <div className="flex items-center gap-1.5 text-xs text-muted mb-2 font-bold">
                          <Terminal className="h-3.5 w-3.5" />
                          <span>Stack Trace & Exception Details:</span>
                        </div>
                        <pre className="whitespace-pre-wrap leading-relaxed">
                          {log.exception ? `${log.exception}\n\n` : ""}
                          {log.stackTrace}
                        </pre>
                      </div>
                    )}
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

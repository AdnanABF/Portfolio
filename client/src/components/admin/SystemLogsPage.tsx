"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Info,
  ListFilter,
  Loader2,
  RefreshCw,
  Terminal,
  XCircle,
} from "lucide-react";
import { LogToolbar } from "@/components/admin/LogToolbar";
import { Pagination } from "@/components/admin/Pagination";
import { Dropdown } from "@/components/ui/Dropdown";
import { PAGE_SIZES, useAdminLogList } from "@/hooks/useAdminLogList";
import { getAdminSystemLogs } from "@/lib/api-client";
import type { SystemLogPage } from "@/lib/types";

const FILTER_KEYS = ["level"];
const LEVELS = ["Error", "Warning", "Information"];

function SystemLogsContent() {
  const list = useAdminLogList<SystemLogPage>({
    filterKeys: FILTER_KEYS,
    isValidFilter: (_key, value) => LEVELS.includes(value),
    fetchPage: (query) =>
      getAdminSystemLogs({
        search: query.search,
        level: query.level as string | undefined,
        from: query.from,
        to: query.to,
        page: query.page,
        pageSize: query.pageSize,
      }),
  });

  // The expanded row is reset whenever the filters or the page change.
  const [expanded, setExpanded] = useState<{ key: string; id: string | null }>({ key: list.queryKey, id: null });
  const expandedId = expanded.key === list.queryKey ? expanded.id : null;
  const setExpandedId = (id: string | null) => setExpanded({ key: list.queryKey, id });

  const { data, loading, failed } = list;
  const logs = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const level = list.filters.level;

  // Counts cover all logs, not just the current search.
  const withCount = (label: string, count: number | undefined) =>
    count === undefined ? label : `${label} (${count})`;
  const levelOptions = [
    {
      value: "",
      label: withCount(
        "All levels",
        data ? (data.errorCount ?? 0) + (data.warningCount ?? 0) + (data.informationCount ?? 0) : undefined,
      ),
    },
    { value: "Error", label: withCount("Error", data?.errorCount) },
    { value: "Warning", label: withCount("Warning", data?.warningCount) },
    { value: "Information", label: withCount("Information", data?.informationCount) },
  ];

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
            onClick={list.refetch}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-line bg-surface px-4 py-2 font-mono text-xs font-bold shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-y-[-1px] transition-all self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            Refresh
          </button>
        </div>

        <LogToolbar
          searchInput={list.searchInput}
          onSearchChange={list.setSearchInput}
          searchPlaceholder="Search message, path or exception..."
          from={list.from}
          to={list.to}
          onDateChange={list.setDate}
          filtersActive={list.filtersActive}
          onClear={list.clearFilters}
        >
          <Dropdown
            className="min-w-0 flex-1 @[748px]:flex-none"
            icon={ListFilter}
            ariaLabel="Filter by level"
            value={level}
            options={levelOptions}
            onChange={(value) => list.setFilter("level", value)}
          />
        </LogToolbar>

        {list.dateRangeInvalid && (
          <p role="alert" className="mt-3 font-mono text-xs text-accent-coral">
            The start date must not be after the end date.
          </p>
        )}

        {/* Logs List */}
        <div className="mt-6" aria-busy={loading}>
          {!data && loading ? (
            <div className="flex items-center justify-center p-12 text-muted font-mono text-xs">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
              Loading system logs...
            </div>
          ) : failed ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-3 rounded-2xl border-2 border-line bg-surface p-8 text-center font-mono text-xs text-muted"
            >
              <CircleAlert className="h-5 w-5 text-accent-coral" aria-hidden="true" />
              Could not load the system logs.
              <button
                type="button"
                onClick={list.refetch}
                className="cursor-pointer rounded-lg border-2 border-line bg-surface-2 px-3 py-1.5 font-bold text-foreground hover:bg-surface"
              >
                Try again
              </button>
            </div>
          ) : logs.length === 0 && !loading ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-line bg-surface p-8 text-center font-mono text-xs text-muted">
              {list.filtersActive ? "No system logs match these filters." : "No system logs yet."}
              {list.filtersActive && (
                <button
                  type="button"
                  onClick={list.clearFilters}
                  className="cursor-pointer rounded-lg border-2 border-line bg-surface-2 px-3 py-1.5 font-bold text-foreground hover:bg-surface"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className={`space-y-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
              {logs.map((log) => {
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
                          {new Date(log.timestamp).toLocaleString()}
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

        {data && totalCount > 0 && (
          <Pagination
            totalItems={totalCount}
            page={list.page}
            pageSize={list.pageSize}
            pageSizeOptions={PAGE_SIZES}
            disabled={loading}
            sizeLabel="Entries per page"
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
          />
        )}
      </div>
    </div>
  );
}

export function AdminSystemLogsPage() {
  return (
    <Suspense fallback={null}>
      <SystemLogsContent />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, CircleAlert, History, ListFilter, Loader2, RefreshCw } from "lucide-react";
import { LogToolbar } from "@/components/admin/LogToolbar";
import { Pagination } from "@/components/admin/Pagination";
import { Dropdown } from "@/components/ui/Dropdown";
import { PAGE_SIZES, useAdminLogList } from "@/hooks/useAdminLogList";
import { getAdminActivity } from "@/lib/api-client";
import type { ActivityLogPage } from "@/lib/types";

const FILTER_KEYS = ["action", "entity"];

function ActivityContent() {
  const list = useAdminLogList<ActivityLogPage>({
    filterKeys: FILTER_KEYS,
    fetchPage: (query) =>
      getAdminActivity({
        search: query.search,
        action: query.action as string | undefined,
        entityType: query.entity as string | undefined,
        from: query.from,
        to: query.to,
        page: query.page,
        pageSize: query.pageSize,
      }),
  });

  const { data, loading, failed } = list;
  const logs = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;

  // Keep a filter that is not in the list (for example from a bookmark) selectable, so the dropdown shows it.
  const withCurrent = (values: string[] | undefined, current: string) =>
    current && !(values ?? []).includes(current) ? [current, ...(values ?? [])] : (values ?? []);
  const actionOptions = [
    { value: "", label: "All actions" },
    ...withCurrent(data?.actions, list.filters.action).map((value) => ({ value, label: value })),
  ];
  const entityOptions = [
    { value: "", label: "All entities" },
    ...withCurrent(data?.entityTypes, list.filters.entity).map((value) => ({ value, label: value })),
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
            <span className="font-mono text-xs font-bold text-accent-violet">{"// AUDIT TRAIL"}</span>
            <h1 className="text-3xl font-extrabold text-foreground">Activity & Mutation Logs</h1>
            <p className="mt-1 text-sm text-muted">
              Complete chronological audit trail of all content edits, setting updates, logins, and revocations.
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
          searchPlaceholder="Search action, summary, user or entity..."
          from={list.from}
          to={list.to}
          onDateChange={list.setDate}
          filtersActive={list.filtersActive}
          onClear={list.clearFilters}
        >
          <Dropdown
            className="min-w-0 flex-1 @[748px]:flex-none"
            icon={ListFilter}
            ariaLabel="Filter by action"
            value={list.filters.action}
            options={actionOptions}
            onChange={(value) => list.setFilter("action", value)}
          />
          <Dropdown
            className="min-w-0 flex-1 @[748px]:flex-none"
            icon={ListFilter}
            ariaLabel="Filter by entity"
            value={list.filters.entity}
            options={entityOptions}
            onChange={(value) => list.setFilter("entity", value)}
          />
        </LogToolbar>

        {list.dateRangeInvalid && (
          <p role="alert" className="mt-3 font-mono text-xs text-accent-coral">
            The start date must not be after the end date.
          </p>
        )}

        {/* Logs Feed */}
        <div className="mt-6" aria-busy={loading}>
          {!data && loading ? (
            <div className="flex items-center justify-center p-12 text-muted font-mono text-xs">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
              Loading activity logs...
            </div>
          ) : failed ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-3 rounded-2xl border-2 border-line bg-surface p-8 text-center font-mono text-xs text-muted"
            >
              <CircleAlert className="h-5 w-5 text-accent-coral" aria-hidden="true" />
              Could not load the activity logs.
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
              {list.filtersActive ? "No activity logs match these filters." : "No activity logs yet."}
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

        {data && totalCount > 0 && (
          <Pagination
            totalItems={totalCount}
            page={list.page}
            pageSize={list.pageSize}
            pageSizeOptions={PAGE_SIZES}
            disabled={loading}
            sizeLabel="Events per page"
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
          />
        )}
      </div>
    </div>
  );
}

export function AdminActivityPage() {
  return (
    <Suspense fallback={null}>
      <ActivityContent />
    </Suspense>
  );
}

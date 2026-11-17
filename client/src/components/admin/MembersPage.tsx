"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CircleAlert, ListFilter, Loader2, Lock, RefreshCw, UserPlus, Users } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { MemberDrawer } from "@/components/admin/members/MemberDrawer";
import { MemberFormModal } from "@/components/admin/members/MemberFormModal";
import { Avatar, ROLE_OPTIONS, RoleBadge, STATUS_OPTIONS, StatusBadge, lastLoginText } from "@/components/admin/members/memberUi";
import { Pagination } from "@/components/admin/Pagination";
import { Dropdown } from "@/components/ui/Dropdown";
import { Notice, useNotice } from "@/components/ui/Notice";
import { PAGE_SIZES, useAdminList } from "@/hooks/useAdminList";
import { getMembers } from "@/lib/api-client";
import type { MemberItem, MemberPage, MemberStatus } from "@/lib/types";

const FILTER_KEYS = ["role", "status"];
const FILTER_VALUES: Record<string, string[]> = {
  role: ROLE_OPTIONS.map((o) => o.value).filter(Boolean),
  status: STATUS_OPTIONS.map((o) => o.value).filter(Boolean),
};
const isValidMemberFilter = (key: string, value: string) => FILTER_VALUES[key]?.includes(value) ?? false;

function MembersContent() {
  const searchParams = useSearchParams();
  const { notice, show, dismiss } = useNotice();

  const list = useAdminList<MemberPage>({
    filterKeys: FILTER_KEYS,
    isValidFilter: isValidMemberFilter,
    fetchPage: (query) =>
      getMembers({
        search: query.search,
        role: query.role as string | undefined,
        status: query.status as string | undefined,
        page: query.page,
        pageSize: query.pageSize,
      }),
  });

  const { data, loading, failed } = list;
  const members = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const stats = data?.stats;

  // The open member and the open form live in the page (the member in the URL, so a refresh keeps it open).
  const openId = searchParams.get("member");
  const [form, setForm] = useState<{ mode: "create" } | { mode: "edit"; member: MemberItem } | null>(null);
  const [drawerRefresh, setDrawerRefresh] = useState(0);

  const roleOptions = ROLE_OPTIONS.map((option) => {
    const count = !stats ? undefined : option.value === "Member" ? stats.members : option.value === "Admin" ? stats.admins : undefined;
    return { ...option, label: count === undefined ? option.label : `${option.label} (${count})` };
  });
  const statusOptions = STATUS_OPTIONS.map((option) => {
    // "" (all) has no count of its own; the other options are the status names, which are also the keys of the stats.
    const count = !stats || !option.value ? undefined : stats[option.value as MemberStatus];
    return { ...option, label: typeof count === "number" ? `${option.label} (${count})` : option.label };
  });

  const closeDrawer = () => list.setParam("member", null);

  const handleChanged = (kind: "success" | "error", text: string) => {
    show(kind, text);
    list.refetch();
  };

  return (
    <div className="min-h-screen bg-background pt-28 pb-16 px-4 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="mb-6 inline-flex items-center gap-1.5 font-mono text-xs font-bold text-muted hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex flex-col gap-4 border-b-2 border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-mono text-xs font-bold text-accent-coral">{"// GOVERNANCE"}</span>
            <h1 className="text-3xl font-extrabold text-foreground">Members</h1>
            <p className="mt-1 text-sm text-muted">Everyone with an account: roles, sign-ins, devices, and who is active.</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={list.refetch}
              disabled={loading}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-line bg-surface px-4 py-2 font-mono text-xs font-bold shadow-[2px_2px_0px_var(--shadow-color)] transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setForm({ mode: "create" })}
              className="neo-button-primary inline-flex cursor-pointer items-center gap-2 px-4 py-2 font-mono text-xs font-bold"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add member
            </button>
          </div>
        </div>

        {/* Stats: the whole user table, whatever the filters say */}
        <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="Total users" value={stats?.totalUsers} />
          <StatCard label="Signed in (30 days)" value={stats?.loggedInLast30Days} accent />
          <StatCard label="Active" value={stats?.active} />
          <StatCard label="Pending" value={stats?.pending} />
          <StatCard label="Inactive" value={stats?.inactive} />
        </dl>

        <Notice notice={notice} onDismiss={dismiss} />

        <ListToolbar
          showDates={false}
          searchInput={list.searchInput}
          onSearchChange={list.setSearchInput}
          searchPlaceholder="Search name, email or username..."
          filtersActive={list.filtersActive}
          onClear={list.clearFilters}
        >
          <Dropdown
            className="min-w-0 flex-1 @[748px]:flex-none"
            icon={ListFilter}
            ariaLabel="Filter by role"
            value={list.filters.role}
            options={roleOptions}
            onChange={(value) => list.setFilter("role", value)}
          />
          <Dropdown
            className="min-w-0 flex-1 @[748px]:flex-none"
            icon={ListFilter}
            ariaLabel="Filter by status"
            value={list.filters.status}
            options={statusOptions}
            onChange={(value) => list.setFilter("status", value)}
          />
        </ListToolbar>

        <div className="mt-6" aria-busy={loading}>
          {!data && loading ? (
            <div className="flex items-center justify-center p-12 font-mono text-xs text-muted">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
              Loading members...
            </div>
          ) : failed ? (
            <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border-2 border-line bg-surface p-8 text-center font-mono text-xs text-muted">
              <CircleAlert className="h-5 w-5 text-accent-coral" aria-hidden="true" />
              Could not load the members.
              <button type="button" onClick={list.refetch} className="cursor-pointer rounded-lg border-2 border-line bg-surface-2 px-3 py-1.5 font-bold text-foreground hover:bg-surface">
                Try again
              </button>
            </div>
          ) : members.length === 0 && !loading ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-line bg-surface p-8 text-center font-mono text-xs text-muted">
              <Users className="h-5 w-5" aria-hidden="true" />
              {list.filtersActive ? "No members match these filters." : "No members yet."}
              {list.filtersActive && (
                <button type="button" onClick={list.clearFilters} className="cursor-pointer rounded-lg border-2 border-line bg-surface-2 px-3 py-1.5 font-bold text-foreground hover:bg-surface">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <ul className={`space-y-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
              {members.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => list.setParam("member", member.id)}
                    className={`flex w-full cursor-pointer flex-col gap-3 rounded-xl border-2 bg-surface p-4 text-left shadow-[3px_3px_0px_var(--shadow-color)] transition-all hover:-translate-y-px sm:flex-row sm:items-center sm:justify-between ${
                      openId === member.id ? "border-primary" : "border-line"
                    } ${member.status === "deleted" ? "opacity-70" : ""}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={member.fullName} email={member.email} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-bold text-foreground">{member.fullName || member.userName}</span>
                          <RoleBadge role={member.role} />
                          <StatusBadge status={member.status} />
                        </div>
                        <p className="truncate font-mono text-xs text-muted">{member.email}</p>
                      </div>
                    </div>
                    <div className="shrink-0 font-mono text-[11px] text-muted sm:text-right">
                      <p title={member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString() : undefined}>{lastLoginText(member, list.loadedAt)}</p>
                      <p>
                        {member.activeSessions} {member.activeSessions === 1 ? "session" : "sessions"} now
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {data && totalCount > 0 && (
          <Pagination
            totalItems={totalCount}
            page={list.page}
            pageSize={list.pageSize}
            pageSizeOptions={PAGE_SIZES}
            disabled={loading}
            sizeLabel="Members per page"
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
          />
        )}
      </div>

      {openId && (
        <MemberDrawer
          key={openId}
          memberId={openId}
          refreshKey={drawerRefresh}
          onClose={closeDrawer}
          onEdit={(member) => setForm({ mode: "edit", member })}
          onChanged={handleChanged}
        />
      )}

      {form && (
        <MemberFormModal
          member={form.mode === "edit" ? form.member : undefined}
          onClose={() => setForm(null)}
          onSaved={(result, mode) => {
            setForm(null);
            setDrawerRefresh((n) => n + 1);
            const name = result.member.fullName;
            if (mode === "create") {
              show(
                result.emailSent ? "success" : "error",
                result.emailSent
                  ? `${name} was added. An invite email is on its way to ${result.member.email}.`
                  : `${name} was added, but the invite email could not be sent. Open the member and use "Resend invite".`,
              );
              list.setParam("member", result.member.id);
            } else {
              show("success", `${name} was saved.${result.emailSent ? " A confirmation email was sent to the new address." : ""}`);
            }
            list.refetch();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: number | undefined; accent?: boolean }) {
  return (
    <div className={`rounded-xl border-2 bg-surface p-3 shadow-[3px_3px_0px_var(--shadow-color)] ${accent ? "border-primary" : "border-line"}`}>
      <dt className="font-mono text-[10px] font-bold text-muted">{label.toUpperCase()}</dt>
      <dd className="mt-1 text-2xl font-extrabold text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

/** Only the owner (SuperAdmin) manages members. Everyone else sees a short explanation, not an error. */
export function AdminMembersPage() {
  const { isSuperAdmin, isLoading } = useAdmin();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex items-center gap-2 font-mono text-xs text-muted">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading...
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 pt-28 pb-16">
        <div className="w-full max-w-md rounded-2xl border-3 border-line bg-surface p-8 text-center shadow-[8px_8px_0px_var(--shadow-color)]">
          <Lock className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-extrabold text-foreground">Owner only</h1>
          <p className="mt-2 font-mono text-xs text-muted">Only the site owner can manage members.</p>
          <button type="button" onClick={() => router.push("/admin")} className="neo-button-secondary mt-6 cursor-pointer px-4 py-2 font-mono text-xs font-bold">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="flex items-center gap-2 font-mono text-xs text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading members...
          </div>
        </div>
      }
    >
      <MembersContent />
    </Suspense>
  );
}

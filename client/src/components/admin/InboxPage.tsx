"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  Copy,
  ExternalLink,
  FilterX,
  Inbox,
  ListFilter,
  Loader2,
  Lock,
  Mail,
  MailOpen,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Pagination } from "@/components/admin/Pagination";
import { Dropdown } from "@/components/ui/Dropdown";
import {
  bulkUpdateInquiryStatus,
  getAdminInquiries,
  isUnauthorized,
  updateInquiryStatus,
} from "@/lib/api-client";
import { dayStartIso, isIsoDay, nextDayStartIso, parsePositiveInt } from "@/lib/dates";
import type { InquiryItem, InquiryPage, InquiryStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants and small helpers
// ---------------------------------------------------------------------------

const PAGE_SIZES = [10, 20, 30, 50];
const DEFAULT_PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "contact", label: "Messages" },
  { value: "repo_request", label: "Repo requests" },
];

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

interface StatusAction {
  status: InquiryStatus;
  label: string;
  icon: IconType;
  /** Past-tense wording used in the confirmation notice after a bulk update. */
  done: string;
}

const ACTIONS: Record<string, StatusAction> = {
  read: { status: "read", label: "Mark read", icon: MailOpen, done: "marked as read" },
  unread: { status: "unread", label: "Mark unread", icon: Mail, done: "marked as unread" },
  replied: { status: "replied", label: "Mark replied", icon: CheckCheck, done: "marked as replied" },
  archived: { status: "archived", label: "Archive", icon: Archive, done: "archived" },
  restore: { status: "read", label: "Restore", icon: ArchiveRestore, done: "restored" },
};

/** The actions that make sense for a message in each state. */
function actionsFor(status: InquiryStatus): StatusAction[] {
  switch (status) {
    case "unread":
      return [ACTIONS.read, ACTIONS.replied, ACTIONS.archived];
    case "read":
      return [ACTIONS.unread, ACTIONS.replied, ACTIONS.archived];
    case "replied":
      return [ACTIONS.read, ACTIONS.unread, ACTIONS.archived];
    case "archived":
      return [ACTIONS.restore, ACTIONS.unread];
    default:
      // A status this page does not know (for example a value set by hand in the database): offer every
      // action so the message can still be sorted into a known state instead of breaking the row.
      return [ACTIONS.read, ACTIONS.unread, ACTIONS.replied, ACTIONS.archived];
  }
}

function formatRelative(iso: string, nowMs: number): string {
  const received = new Date(iso);
  const minutes = Math.round((nowMs - received.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const sameYear = received.getFullYear() === new Date(nowMs).getFullYear();
  return received.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function preview(message: string): string {
  return message.replace(/\s+/g, " ").trim().slice(0, 140);
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = "default",
}: {
  icon: IconType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "mint" | "muted";
}) {
  const toneClass =
    tone === "mint"
      ? "text-accent-mint"
      : tone === "muted"
        ? "text-muted hover:text-foreground"
        : "text-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-2 border-line bg-surface px-3 py-1.5 font-mono text-[11px] font-bold transition-all hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

function StatusChip({ status }: { status: InquiryStatus }) {
  const base =
    "inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold";
  switch (status) {
    case "unread":
      return (
        <span className={`${base} border-primary bg-primary/15 text-primary`}>
          <Mail className="h-2.5 w-2.5" aria-hidden="true" />
          UNREAD
        </span>
      );
    case "read":
      return (
        <span className={`${base} border-line text-muted`}>
          <MailOpen className="h-2.5 w-2.5" aria-hidden="true" />
          READ
        </span>
      );
    case "replied":
      return (
        <span className={`${base} border-accent-mint bg-accent-mint/15 text-accent-mint`}>
          <CheckCheck className="h-2.5 w-2.5" aria-hidden="true" />
          REPLIED
        </span>
      );
    case "archived":
      return (
        <span className={`${base} border-line bg-surface-2 text-muted`}>
          <Archive className="h-2.5 w-2.5" aria-hidden="true" />
          ARCHIVED
        </span>
      );
    default:
      // Unknown status: show it as-is rather than showing nothing.
      return <span className={`${base} border-line text-muted`}>{String(status).toUpperCase()}</span>;
  }
}

function InquiryRow({
  item,
  nowMs,
  expanded,
  selected,
  copied,
  onToggleExpand,
  onToggleSelect,
  onStatus,
  onCopy,
}: {
  item: InquiryItem;
  nowMs: number;
  expanded: boolean;
  selected: boolean;
  copied: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onStatus: (status: InquiryStatus) => void;
  onCopy: () => void;
}) {
  const isUnread = item.status === "unread";
  const isRepoRequest = item.type === "repo_request";
  const detailsId = `inquiry-details-${item.id}`;

  const handleHeaderClick = () => {
    // Dragging to select text inside the row should not open or close it.
    if (window.getSelection()?.toString()) return;
    onToggleExpand();
  };

  return (
    <li
      className={`overflow-hidden rounded-xl border-2 border-line bg-surface shadow-[3px_3px_0px_var(--shadow-color)] ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      {/* The whole header is the click target, padding and edges included. The checkbox stops the click
          so ticking it never expands the row. The inner button has no handler of its own: its click
          (mouse or keyboard) bubbles up to this container exactly once. */}
      <div
        onClick={handleHeaderClick}
        className="flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors hover:bg-surface-2/50"
      >
        <label
          className="-m-2 flex shrink-0 cursor-pointer items-center p-2"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select message from ${item.name}`}
            className="h-4 w-4 cursor-pointer rounded accent-primary"
          />
        </label>

        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={detailsId}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
        >
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${isUnread ? "bg-primary" : "bg-transparent"}`}
            title={isUnread ? "Unread" : undefined}
            aria-hidden="true"
          />

          {isRepoRequest ? (
            <Lock className="h-4 w-4 shrink-0 text-accent-coral" aria-label="Repo request" />
          ) : (
            <Mail className="h-4 w-4 shrink-0 text-muted" aria-label="Message" />
          )}

          <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
            <span
              className={`truncate text-sm sm:w-44 sm:shrink-0 ${
                isUnread ? "font-extrabold text-foreground" : "font-medium text-foreground/80"
              }`}
            >
              {item.name}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">
              <span className={isUnread ? "font-bold text-foreground" : "font-medium text-foreground/80"}>
                {item.subject || "No subject"}
              </span>
              <span className="text-muted"> — {preview(item.message)}</span>
            </span>
          </span>

          <span className="hidden shrink-0 sm:inline-flex">
            <StatusChip status={item.status} />
          </span>
          <time
            dateTime={item.createdAt}
            title={new Date(item.createdAt).toLocaleString()}
            className="w-16 shrink-0 text-right font-mono text-[11px] text-muted"
          >
            {formatRelative(item.createdAt, nowMs)}
          </time>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {expanded && (
        <div id={detailsId} className="border-t-2 border-line bg-surface-2/60 px-4 py-4 sm:px-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-foreground">{item.subject || "No subject"}</h3>
            <StatusChip status={item.status} />
            {isRepoRequest && (
              <span className="inline-flex items-center gap-1 rounded border border-line bg-accent-yellow/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground">
                <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                REPO REQUEST
              </span>
            )}
          </div>

          <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 font-mono text-muted">From</dt>
              <dd className="min-w-0 break-words font-semibold text-foreground">{item.name}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="w-16 shrink-0 font-mono text-muted">Email</dt>
              <dd className="flex min-w-0 items-center gap-1.5">
                <a
                  href={`mailto:${item.email}`}
                  className="min-w-0 break-all font-mono text-primary hover:underline"
                >
                  {item.email}
                </a>
                <button
                  type="button"
                  onClick={onCopy}
                  title={copied ? "Copied" : "Copy email address"}
                  aria-label={copied ? "Email address copied" : "Copy email address"}
                  className="shrink-0 cursor-pointer rounded p-1 text-muted transition-colors hover:text-foreground"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-accent-mint" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 font-mono text-muted">Received</dt>
              <dd className="text-foreground">{new Date(item.createdAt).toLocaleString()}</dd>
            </div>
            {isRepoRequest && (
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-mono text-muted">Project</dt>
                <dd className="min-w-0 break-words text-foreground">
                  {item.projectSlug ? (
                    <Link
                      href={`/projects/${item.projectSlug}`}
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      {item.projectTitle}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  ) : (
                    <span className="text-muted">(deleted project)</span>
                  )}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-4 whitespace-pre-wrap break-words rounded-lg border border-line bg-surface p-3 text-sm leading-relaxed text-foreground/90">
            {item.message}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {actionsFor(item.status).map((action) => (
              <ActionButton
                key={action.label}
                icon={action.icon}
                label={action.label}
                tone={action.status === "replied" ? "mint" : action.status === "archived" ? "muted" : "default"}
                onClick={() => onStatus(action.status)}
              />
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface LoadResult {
  /** Identifies the request this result belongs to (filters, page and refresh counter). */
  key: string;
  page: InquiryPage | null;
  /** "auth": the session is missing or expired (HTTP 401). "failed": any other problem. */
  error: "auth" | "failed" | null;
  loadedAt: number;
}

interface Notice {
  id: number;
  kind: "success" | "error";
  text: string;
}

function InboxContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listRef = useRef<HTMLDivElement>(null);

  // ---- filters live in the URL, so refresh, Back and bookmarks keep them ----------------
  const q = searchParams.get("q") ?? "";
  const rawStatus = searchParams.get("status") ?? "";
  const rawType = searchParams.get("type") ?? "";
  const rawFrom = searchParams.get("from") ?? "";
  const rawTo = searchParams.get("to") ?? "";
  const status = STATUS_OPTIONS.some((o) => o.value === rawStatus) ? rawStatus : "";
  const type = TYPE_OPTIONS.some((o) => o.value === rawType) ? rawType : "";
  const from = isIsoDay(rawFrom) ? rawFrom : "";
  const to = isIsoDay(rawTo) ? rawTo : "";
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const sizeParam = Number(searchParams.get("size"));
  const pageSize = PAGE_SIZES.includes(sizeParam) ? sizeParam : DEFAULT_PAGE_SIZE;

  const filtersActive = Boolean(q || status || type || from || to);
  const dateRangeInvalid = Boolean(from && to && from > to);

  const updateParams = useCallback(
    (changes: Record<string, string | null>, options: { keepPage?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      // Any filter or size change starts again from the first page.
      if (!options.keepPage) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // ---- search box: typing is debounced into the URL --------------------------------------
  const [searchInput, setSearchInput] = useState(q);
  const [prevQ, setPrevQ] = useState(q);
  const [pushedQ, setPushedQ] = useState(q);

  // When the URL changes by something other than our own typing (Back button, Clear filters),
  // bring the input in line with it.
  if (q !== prevQ) {
    setPrevQ(q);
    if (q !== pushedQ) {
      setSearchInput(q);
      setPushedQ(q);
    }
  }

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === q) return;
    const timer = window.setTimeout(() => {
      setPushedQ(trimmed);
      updateParams({ q: trimmed });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, q, updateParams]);

  // ---- loading data -----------------------------------------------------------------------
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<LoadResult>({ key: "", page: null, error: null, loadedAt: 0 });

  const queryKey = `${q}|${status}|${type}|${from}|${to}|${page}|${pageSize}`;
  const requestKey = `${queryKey}#${reloadToken}`;
  const apiQuery = useMemo(
    () => ({
      search: q || undefined,
      status: status || undefined,
      type: type || undefined,
      from: from ? dayStartIso(from) : undefined,
      to: to ? nextDayStartIso(to) : undefined,
      page,
      pageSize,
    }),
    [q, status, type, from, to, page, pageSize],
  );

  useEffect(() => {
    if (dateRangeInvalid) return;
    let cancelled = false;
    getAdminInquiries(apiQuery)
      .then((loaded) => {
        if (!cancelled) setResult({ key: requestKey, page: loaded, error: null, loadedAt: Date.now() });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setResult({
            key: requestKey,
            page: null,
            error: isUnauthorized(error) ? "auth" : "failed",
            loadedAt: Date.now(),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiQuery, requestKey, dateRangeInvalid]);

  // ---- an expired session sends you to the login page and back here afterwards ---------------
  const here = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  const loginHref = `/admin/login?from=${encodeURIComponent(here)}`;

  useEffect(() => {
    if (result.error === "auth") router.replace(loginHref);
  }, [result.error, loginHref, router]);

  const loading = !dateRangeInvalid && result.key !== requestKey;
  const data = result.page;
  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const unreadCount = data?.unreadCount ?? 0;
  const nowMs = result.loadedAt;

  // ---- selection and expansion are reset whenever the filters or the page change ---------
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(queryKey);
  if (resetKey !== queryKey) {
    setResetKey(queryKey);
    setSelected(new Set());
    setExpandedId(null);
  }

  const [notice, setNotice] = useState<Notice | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const noticeCounter = useRef(0);
  const showNotice = (kind: Notice["kind"], text: string) => {
    noticeCounter.current += 1;
    const id = noticeCounter.current;
    setNotice({ id, kind, text });
    window.setTimeout(() => setNotice((current) => (current?.id === id ? null : current)), 4000);
  };

  const refetch = () => setReloadToken((token) => token + 1);

  /** Updates one message in the loaded page without asking the server again. */
  const patchItemStatus = (id: string, newStatus: InquiryStatus) => {
    setResult((current) => {
      if (!current.page) return current;
      const old = current.page.items.find((item) => item.id === id);
      if (!old) return current;
      const delta = (newStatus === "unread" ? 1 : 0) - (old.status === "unread" ? 1 : 0);
      return {
        ...current,
        page: {
          ...current.page,
          items: current.page.items.map((item) => (item.id === id ? { ...item, status: newStatus } : item)),
          unreadCount: Math.max(0, current.page.unreadCount + delta),
        },
      };
    });
  };

  const changeStatus = async (item: InquiryItem, newStatus: InquiryStatus, automatic = false) => {
    if (item.status === newStatus) return;
    const previous = item.status;
    patchItemStatus(item.id, newStatus);
    try {
      await updateInquiryStatus(item.id, newStatus);
      // Opening a message marks it read without reloading, so it does not vanish from an "Unread" view
      // while it is being read. Deliberate actions reload, so totals and pages stay accurate.
      if (!automatic) refetch();
    } catch (error) {
      patchItemStatus(item.id, previous);
      if (isUnauthorized(error)) {
        router.replace(loginHref);
        return;
      }
      showNotice("error", "Could not update the message. Please try again.");
    }
  };

  const toggleExpand = (item: InquiryItem) => {
    const opening = expandedId !== item.id;
    setExpandedId(opening ? item.id : null);
    if (opening && item.status === "unread") {
      void changeStatus(item, "read", true);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageSelected = items.length > 0 && items.every((item) => selected.has(item.id));
  const toggleSelectAll = () => {
    setSelected(allOnPageSelected ? new Set() : new Set(items.map((item) => item.id)));
  };

  const runBulk = async (action: StatusAction) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const updated = await bulkUpdateInquiryStatus(ids, action.status);
      setSelected(new Set());
      showNotice("success", `${updated} message${updated === 1 ? "" : "s"} ${action.done}.`);
      refetch();
    } catch (error) {
      if (isUnauthorized(error)) {
        router.replace(loginHref);
        return;
      }
      showNotice("error", "Could not update the selected messages. Please try again.");
    } finally {
      setBulkBusy(false);
    }
  };

  const copyEmail = async (item: InquiryItem) => {
    try {
      await navigator.clipboard.writeText(item.email);
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId((current) => (current === item.id ? null : current)), 2000);
    } catch {
      showNotice("error", "Could not copy the address. Select it and copy manually.");
    }
  };

  const goToPage = (nextPage: number) => {
    updateParams({ page: nextPage > 1 ? String(nextPage) : null }, { keepPage: true });
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearFilters = () => router.replace(pathname, { scroll: false });

  const viewingArchived = status === "archived";
  const bulkActions = [ACTIONS.read, ACTIONS.unread, ACTIONS.replied, viewingArchived ? ACTIONS.restore : ACTIONS.archived];

  let body: ReactNode;
  if (dateRangeInvalid) {
    body = (
      <div className="flex items-center gap-2 rounded-xl border-2 border-line bg-surface p-6 font-mono text-xs text-muted">
        <CircleAlert className="h-4 w-4 text-accent-coral" aria-hidden="true" />
        The From date must not be after the To date.
      </div>
    );
  } else if (result.key === "" && loading) {
    body = (
      <div className="flex items-center justify-center p-12 font-mono text-xs text-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
        Loading messages...
      </div>
    );
  } else if (result.error === "auth") {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-line bg-surface p-8 text-center">
        <Lock className="h-6 w-6 text-accent-coral" aria-hidden="true" />
        <p className="font-mono text-xs text-muted">
          Your session has expired. Taking you to the sign-in page...
        </p>
        <Link
          href={loginHref}
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-line bg-primary px-3 py-1.5 font-mono text-[11px] font-bold text-white shadow-[2px_2px_0px_var(--shadow-color)] dark:text-black"
        >
          Sign in
        </Link>
      </div>
    );
  } else if (result.error && !data) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-line bg-surface p-8 text-center">
        <CircleAlert className="h-6 w-6 text-accent-coral" aria-hidden="true" />
        <p className="font-mono text-xs text-muted">
          Could not load messages. Check that the API is running, then try again.
        </p>
        <ActionButton icon={RefreshCw} label="Try again" onClick={refetch} />
      </div>
    );
  } else if (items.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-line bg-surface p-10 text-center">
        <Inbox className="h-8 w-8 text-muted" aria-hidden="true" />
        {filtersActive ? (
          <>
            <p className="font-mono text-xs text-muted">No messages match your filters.</p>
            <ActionButton icon={FilterX} label="Clear filters" onClick={clearFilters} />
          </>
        ) : (
          <p className="font-mono text-xs text-muted">
            No messages yet. Messages from the contact form and repo requests will appear here.
          </p>
        )}
      </div>
    );
  } else {
    body = (
      <>
        <div className="mb-3 flex items-center gap-3 px-3">
          <input
            type="checkbox"
            checked={allOnPageSelected}
            onChange={toggleSelectAll}
            aria-label="Select all messages on this page"
            className="h-4 w-4 cursor-pointer rounded accent-primary"
          />
          <span className="font-mono text-xs text-muted">Select all on this page</span>
        </div>
        <ul className={`space-y-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {items.map((item) => (
            <InquiryRow
              key={item.id}
              item={item}
              nowMs={nowMs}
              expanded={expandedId === item.id}
              selected={selected.has(item.id)}
              copied={copiedId === item.id}
              onToggleExpand={() => toggleExpand(item)}
              onToggleSelect={() => toggleSelect(item.id)}
              onStatus={(next) => void changeStatus(item, next)}
              onCopy={() => void copyEmail(item)}
            />
          ))}
        </ul>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pb-16 pt-28 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-1.5 font-mono text-xs font-bold text-muted hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex flex-col gap-4 border-b-2 border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="font-mono text-xs font-bold text-primary">{"// CONTACT INQUIRIES"}</span>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold text-foreground">Inbound Messages & Leads</h1>
              <button
                type="button"
                onClick={refetch}
                disabled={loading}
                title="Refresh"
                aria-label="Refresh messages"
                className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:text-primary disabled:cursor-wait"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin text-primary" : ""}`} />
              </button>
            </div>
            <p className="mt-1 text-sm text-muted">
              Review messages from the contact form and repo access requests.
              {data && (
                <span className="ml-2 inline-flex items-center gap-1 font-mono text-xs font-bold text-primary">
                  <Mail className="h-3 w-3" aria-hidden="true" />
                  {unreadCount} unread
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Search and filters */}
        {/* One row when everything fits. Otherwise the search takes the whole first row and the rest follows
            on the second. On the narrowest screens the date range gets its own row and the two filters share
            the last one with the clear button. The widths are the toolbar's own width (container queries),
            set 2px above what the controls measure: 954px for one row, 746px for two. If the controls
            change size, re-measure and update 956px and 748px below. */}
        <div className="@container mt-6" role="search">
          <div className="flex flex-col gap-2 @[956px]:flex-row @[956px]:items-center">
            <div className="relative w-full @[956px]:w-auto @[956px]:min-w-[200px] @[956px]:flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                maxLength={100}
                placeholder="Search messages..."
                title="Search by name, email, subject or message text"
                aria-label="Search by name, email, subject or message text"
                className="neo-input h-10 w-full pl-9 pr-3 text-sm outline-none placeholder:text-muted/60"
              />
            </div>

            <div className="flex flex-col gap-2 @[748px]:flex-row @[748px]:items-center">
              {/* Every control in this toolbar is h-10, so the rows line up. */}
              <div className="neo-input flex h-10 w-full items-center gap-x-2 px-2.5 text-xs sm:gap-x-3 sm:px-3 @[748px]:w-auto">
                <Calendar className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <label className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5 @[748px]:flex-none">
                  <span className="font-mono text-muted">From:</span>
                  <input
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => updateParams({ from: e.target.value })}
                    aria-label="Received from date"
                    className="w-full min-w-0 cursor-pointer bg-transparent font-semibold text-foreground outline-none [color-scheme:light] dark:[color-scheme:dark] @[748px]:w-auto"
                  />
                </label>
                <span className="hidden h-4 w-px bg-line sm:block" aria-hidden="true" />
                <label className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5 @[748px]:flex-none">
                  <span className="font-mono text-muted">To:</span>
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => updateParams({ to: e.target.value })}
                    aria-label="Received to date"
                    className="w-full min-w-0 cursor-pointer bg-transparent font-semibold text-foreground outline-none [color-scheme:light] dark:[color-scheme:dark] @[748px]:w-auto"
                  />
                </label>
              </div>

              <div className="flex w-full items-center gap-2 @[748px]:w-auto">
                <Dropdown
                  className="min-w-0 flex-1 @[748px]:flex-none"
                  icon={ListFilter}
                  ariaLabel="Filter by status"
                  value={status}
                  options={STATUS_OPTIONS}
                  onChange={(value) => updateParams({ status: value })}
                />
                <Dropdown
                  className="min-w-0 flex-1 @[748px]:flex-none"
                  icon={ListFilter}
                  ariaLabel="Filter by type"
                  value={type}
                  options={TYPE_OPTIONS}
                  onChange={(value) => updateParams({ type: value })}
                />

                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!filtersActive}
                  title="Clear filters"
                  aria-label="Clear filters"
                  className="neo-input flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FilterX className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Result notice (updates, errors) */}
        <div aria-live="polite">
          {notice && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-semibold ${
                notice.kind === "success"
                  ? "border-accent-mint bg-accent-mint/10 text-accent-mint"
                  : "border-accent-coral bg-accent-coral/10 text-accent-coral"
              }`}
            >
              {notice.kind === "success" ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <CircleAlert className="h-4 w-4" aria-hidden="true" />
              )}
              {notice.text}
            </div>
          )}
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div
            role="region"
            aria-label="Bulk actions"
            className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border-2 border-line bg-surface-accent px-3 py-2 shadow-[3px_3px_0px_var(--shadow-color)]"
          >
            <span className="mr-1 font-mono text-xs font-bold text-foreground">{selected.size} selected</span>
            {bulkActions.map((action) => (
              <ActionButton
                key={action.label}
                icon={action.icon}
                label={action.label}
                disabled={bulkBusy}
                tone={action.status === "replied" ? "mint" : "default"}
                onClick={() => void runBulk(action)}
              />
            ))}
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              title="Clear selection"
              aria-label="Clear selection"
              className="ml-auto cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Messages */}
        <div ref={listRef} className="mt-6 scroll-mt-24">
          {body}
        </div>

        {data && !dateRangeInvalid && (
          <Pagination
            totalItems={totalCount}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZES}
            disabled={loading}
            sizeLabel="Messages per page"
            onPageChange={goToPage}
            onPageSizeChange={(size) => updateParams({ size: size === DEFAULT_PAGE_SIZE ? null : String(size) })}
          />
        )}
      </div>
    </div>
  );
}

export function AdminInboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="flex flex-col items-center gap-3 font-mono text-xs text-muted">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Loading inbox...</span>
          </div>
        </div>
      }
    >
      <InboxContent />
    </Suspense>
  );
}

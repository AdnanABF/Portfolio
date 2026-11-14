"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isUnauthorized } from "@/lib/api-client";
import { dayStartIso, isIsoDay, nextDayStartIso, parsePositiveInt } from "@/lib/dates";
import type { LogQuery } from "@/lib/types";

export const PAGE_SIZES = [10, 20, 30, 50];
const DEFAULT_PAGE_SIZE = 10;

interface LoadResult<TPage> {
  /** Identifies the request this result belongs to (filters, page and refresh counter). */
  key: string;
  page: TPage | null;
  /** "auth": the session is missing or expired (HTTP 401). "failed": any other problem. */
  error: "auth" | "failed" | null;
  /** When this result arrived, for "5m ago" style times that should not change on every render. */
  loadedAt: number;
}

/** What the hook needs to know about a loaded page; every paged admin list has these. */
interface PagedResult {
  items: unknown[];
  totalCount: number;
}

interface Options<TPage> {
  /** Extra dropdown filters kept in the URL under these names. */
  filterKeys?: string[];
  /** Whether a value found in the URL is acceptable for a filter; unknown values fall back to "" (all). */
  isValidFilter?: (key: string, value: string) => boolean;
  /** Loads one page. Called with the API query; extra filters are included by their key. */
  fetchPage: (query: LogQuery & Record<string, string | number | undefined>) => Promise<TPage>;
}

/**
 * State for a server-paged admin list (logs, members): search, filters, an optional date range, page and size live
 * in the URL (so refresh, Back and bookmarks keep them), typing in the search box is debounced, and the current
 * page is loaded with request cancellation. An expired session redirects to the login page. A list without a date
 * range simply never sets "from" or "to".
 *
 * Must be used below a Suspense boundary because it reads the search params.
 */
export function useAdminList<TPage extends PagedResult>({ filterKeys = [], isValidFilter, fetchPage }: Options<TPage>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ---- filters live in the URL -------------------------------------------------------------
  const q = searchParams.get("q") ?? "";
  const rawFrom = searchParams.get("from") ?? "";
  const rawTo = searchParams.get("to") ?? "";
  const from = isIsoDay(rawFrom) ? rawFrom : "";
  const to = isIsoDay(rawTo) ? rawTo : "";
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const sizeParam = Number(searchParams.get("size"));
  const pageSize = PAGE_SIZES.includes(sizeParam) ? sizeParam : DEFAULT_PAGE_SIZE;

  // Only the filter values that are acceptable (known keys, valid values) are used; anything else means "all".
  //
  // Callers often write filterKeys and isValidFilter inline, so their identity changes on every render. They must
  // never be dependencies of a memo or an effect here: that would rebuild the query on every render, re-run the
  // fetch effect, and request the list again and again without end. Everything below watches filtersKey instead,
  // a string that only changes when a filter value really changes.
  const filters: Record<string, string> = {};
  for (const key of filterKeys) {
    const raw = searchParams.get(key) ?? "";
    filters[key] = raw && (!isValidFilter || isValidFilter(key, raw)) ? raw : "";
  }
  const filtersKey = JSON.stringify(filters);

  const filtersActive = Boolean(q || from || to || Object.values(filters).some(Boolean));
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

  // ---- search box: typing is debounced into the URL ----------------------------------------
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

  // ---- loading data ------------------------------------------------------------------------
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<LoadResult<TPage>>({ key: "", page: null, error: null, loadedAt: 0 });

  const fetchRef = useRef(fetchPage);
  useEffect(() => {
    fetchRef.current = fetchPage;
  });

  const queryKey = `${q}|${filtersKey}|${from}|${to}|${page}|${pageSize}`;
  const requestKey = `${queryKey}#${reloadToken}`;
  const apiQuery = useMemo(
    () => ({
      search: q || undefined,
      ...Object.fromEntries(Object.entries(JSON.parse(filtersKey) as Record<string, string>).map(([key, value]) => [key, value || undefined])),
      from: from ? dayStartIso(from) : undefined,
      to: to ? nextDayStartIso(to) : undefined,
      page,
      pageSize,
    }),
    [q, filtersKey, from, to, page, pageSize],
  );

  useEffect(() => {
    if (dateRangeInvalid) return;
    let cancelled = false;
    fetchRef
      .current(apiQuery)
      .then((loaded) => {
        if (!cancelled) setResult({ key: requestKey, page: loaded, error: null, loadedAt: Date.now() });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setResult({ key: requestKey, page: null, error: isUnauthorized(error) ? "auth" : "failed", loadedAt: Date.now() });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiQuery, requestKey, dateRangeInvalid]);

  // ---- an expired session sends you to the login page and back here afterwards -------------
  const here = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  const loginHref = `/login?from=${encodeURIComponent(here)}`;

  useEffect(() => {
    if (result.error === "auth") router.replace(loginHref);
  }, [result.error, loginHref, router]);

  // A page past the end (old bookmark, fewer logs than before) is empty: go to the last page that exists.
  const loadedPage = result.page;
  useEffect(() => {
    if (!loadedPage || result.key !== requestKey) return;
    if (page > 1 && loadedPage.totalCount > 0 && loadedPage.items.length === 0) {
      const last = Math.max(1, Math.ceil(loadedPage.totalCount / pageSize));
      updateParams({ page: last <= 1 ? null : String(last) }, { keepPage: true });
    }
  }, [loadedPage, result.key, requestKey, page, pageSize, updateParams]);

  const clearFilters = () => {
    setSearchInput("");
    setPushedQ("");
    updateParams({
      q: null,
      from: null,
      to: null,
      ...Object.fromEntries(filterKeys.map((key) => [key, null])),
    });
  };

  return {
    // filters
    searchInput,
    setSearchInput,
    filters,
    from,
    to,
    page,
    pageSize,
    filtersActive,
    dateRangeInvalid,
    setFilter: (key: string, value: string) => updateParams({ [key]: value }),
    /** Sets or clears a URL parameter that is not a filter (for example the open member) and keeps the page. */
    setParam: (key: string, value: string | null) => updateParams({ [key]: value }, { keepPage: true }),
    setDate: (key: "from" | "to", value: string) => updateParams({ [key]: value }),
    setPage: (next: number) => updateParams({ page: next <= 1 ? null : String(next) }, { keepPage: true }),
    setPageSize: (size: number) => updateParams({ size: size === DEFAULT_PAGE_SIZE ? null : String(size) }),
    clearFilters,
    // data
    data: result.page,
    failed: result.error === "failed",
    /** Time the current data arrived (milliseconds). */
    loadedAt: result.loadedAt,
    loading: !dateRangeInvalid && result.key !== requestKey,
    /** Changes whenever the filters or page change, to reset per-row state such as an expanded row. */
    queryKey,
    refetch: () => setReloadToken((token) => token + 1),
  };
}

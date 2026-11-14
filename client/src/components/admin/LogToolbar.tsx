"use client";

import type { ReactNode } from "react";
import { Calendar, FilterX, Search } from "lucide-react";

interface LogToolbarProps {
  searchInput: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  from: string;
  to: string;
  onDateChange: (key: "from" | "to", value: string) => void;
  filtersActive: boolean;
  onClear: () => void;
  /** Dropdown filters shown next to the date range. */
  children?: ReactNode;
}

const dateInput =
  "w-full min-w-0 cursor-pointer bg-transparent font-semibold text-foreground outline-none [color-scheme:light] dark:[color-scheme:dark] @[748px]:w-auto";

/** Search box, date range, filter slot and "clear filters" button shared by the admin log pages. */
export function LogToolbar({
  searchInput,
  onSearchChange,
  searchPlaceholder,
  from,
  to,
  onDateChange,
  filtersActive,
  onClear,
  children,
}: LogToolbarProps) {
  return (
    <div className="@container mt-6">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            maxLength={100}
            className="neo-input h-10 w-full pl-9 pr-3 text-sm outline-none placeholder:text-muted/60"
          />
        </div>

        <div className="flex flex-col gap-2 @[748px]:flex-row @[748px]:items-center">
          <div className="neo-input flex h-10 w-full items-center gap-x-2 px-2.5 text-xs sm:gap-x-3 sm:px-3 @[748px]:w-auto">
            <Calendar className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <label className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5 @[748px]:flex-none">
              <span className="font-mono text-muted">From:</span>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => onDateChange("from", e.target.value)}
                aria-label="From date"
                className={dateInput}
              />
            </label>
            <span className="hidden h-4 w-px bg-line sm:block" aria-hidden="true" />
            <label className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5 @[748px]:flex-none">
              <span className="font-mono text-muted">To:</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => onDateChange("to", e.target.value)}
                aria-label="To date"
                className={dateInput}
              />
            </label>
          </div>

          <div className="flex w-full items-center gap-2 @[748px]:w-auto">
            {children}
            <button
              type="button"
              onClick={onClear}
              disabled={!filtersActive}
              aria-label="Clear filters"
              title="Clear filters"
              className="neo-input flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FilterX className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

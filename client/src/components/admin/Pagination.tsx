"use client";

import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";

interface PaginationProps {
  totalItems: number;
  /** 1-based current page. */
  page: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
  /** Accessible name of the page-size control, for example "Messages per page". */
  sizeLabel?: string;
}

/** Page numbers to show: first, last, and the current page with one neighbour each side; gaps become "…". */
function pageItems(page: number, totalPages: number): (number | "gap-left" | "gap-right")[] {
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const items: (number | "gap-left" | "gap-right")[] = [];
  sorted.forEach((p, index) => {
    if (index > 0 && p - sorted[index - 1] > 1) {
      items.push(index === 1 ? "gap-left" : "gap-right");
    }
    items.push(p);
  });
  return items;
}

const arrowButton =
  "flex h-9 w-9 items-center justify-center rounded-lg border-2 border-line bg-surface text-foreground " +
  "transition-all hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface cursor-pointer";

export function Pagination({
  totalItems,
  page,
  pageSize,
  pageSizeOptions = [10, 20, 30, 50],
  onPageChange,
  onPageSizeChange,
  disabled = false,
  sizeLabel = "Items per page",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const current = Math.min(page, totalPages);

  return (
    <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4 font-mono text-xs text-muted">
        <span className="font-bold tracking-wide">
          TOTAL {totalItems} {totalItems === 1 ? "ITEM" : "ITEMS"}
        </span>
        <span className="h-4 w-px bg-line" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <List className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Size:</span>
          {/* Opens upward: this control sits at the bottom of the page. */}
          <Dropdown
            variant="inline"
            placement="top"
            ariaLabel={sizeLabel}
            value={String(pageSize)}
            options={pageSizeOptions.map((size) => ({ value: String(size), label: String(size) }))}
            onChange={(value) => onPageSizeChange(Number(value))}
            disabled={disabled}
          />
        </div>
      </div>

      <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(current - 1)}
          disabled={disabled || current <= 1}
          aria-label="Previous page"
          title="Previous page"
          className={arrowButton}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageItems(current, totalPages).map((item) =>
          typeof item === "number" ? (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              disabled={disabled}
              aria-label={`Page ${item}`}
              aria-current={item === current ? "page" : undefined}
              className={`h-9 min-w-9 rounded-lg border-2 border-line px-2 font-mono text-xs font-bold transition-all cursor-pointer ${
                item === current
                  ? "bg-primary text-white shadow-[2px_2px_0px_var(--shadow-color)] dark:text-black"
                  : "bg-surface text-foreground hover:bg-surface-2"
              }`}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="px-1 font-mono text-xs text-muted" aria-hidden="true">
              …
            </span>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(current + 1)}
          disabled={disabled || current >= totalPages}
          aria-label="Next page"
          title="Next page"
          className={arrowButton}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Short line under the title. */
  description?: string;
  children: ReactNode;
  /** Buttons row at the bottom. */
  footer?: ReactNode;
  /** Blocks closing (Escape, backdrop, X) while a request is running. */
  busy?: boolean;
  size?: "sm" | "md";
  /** "right" slides in from the right edge as a full-height panel (a drawer). */
  placement?: "center" | "right";
}

const noopSubscribe = () => () => {};

/** False while the server renders, true in the browser: the portal needs `document`, which the server does not have. */
function useIsBrowser() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A dialog over the page. Escape or a click on the dark backdrop closes it, Tab stays inside it, focus moves in
 * when it opens and goes back to where it was when it closes.
 */
export function Modal({ open, onClose, title, description, children, footer, busy = false, size = "md", placement = "center" }: ModalProps) {
  const titleId = useId();
  const isBrowser = useIsBrowser();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);

  useEffect(() => {
    closeRef.current = onClose;
    busyRef.current = busy;
  });

  useEffect(() => {
    if (!open || !isBrowser) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // Focus the first field, otherwise the first control, otherwise the dialog itself.
    const first = panel?.querySelector<HTMLElement>("input, select, textarea") ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyRef.current) {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, isBrowser]);

  // A drawer that is open on the first render (a page loaded with ?member=...) is drawn once the browser takes over.
  if (!open || !isBrowser) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[60] flex bg-black/60 backdrop-blur-sm ${
        placement === "right" ? "items-stretch justify-end" : "items-end justify-center sm:items-center sm:p-4"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={
          placement === "right"
            ? "h-full w-full overflow-y-auto border-l-3 border-line bg-surface p-5 shadow-[-8px_0px_0px_var(--shadow-color)] outline-none sm:max-w-xl sm:p-6"
            : `max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border-3 border-line bg-surface p-5 shadow-[8px_8px_0px_var(--shadow-color)] outline-none sm:rounded-2xl sm:p-6 ${
                size === "sm" ? "sm:max-w-md" : "sm:max-w-lg"
              }`
        }
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-extrabold text-foreground">
              {title}
            </h2>
            {description && <p className="mt-1 font-mono text-xs text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-cream hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5">{children}</div>

        {footer && <div className="mt-6 flex flex-wrap items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

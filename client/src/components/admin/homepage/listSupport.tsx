"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Eye, EyeOff, Loader2, Pencil } from "lucide-react";
import { ApiError, isUnauthorized } from "@/lib/api-client";

/** Loads a list once, keeps it in state, and reloads on demand. Signed-out errors are passed up to the page. */
export function useEditableList<T>(load: () => Promise<T[]>, onAuthError: () => void) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The latest callbacks, so the loader below keeps one identity and the list is fetched once, not on every render.
  const loadRef = useRef(load);
  const authRef = useRef(onAuthError);
  useEffect(() => {
    loadRef.current = load;
    authRef.current = onAuthError;
  });

  const reload = useCallback(async () => {
    try {
      setItems(await loadRef.current());
      setError(null);
    } catch (e) {
      if (isUnauthorized(e)) authRef.current();
      else setError(e instanceof Error ? e.message : "Could not load the list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // A deferred call, so the state updates inside reload do not run synchronously in the effect.
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  return { items, setItems, loading, error, reload };
}

export function ListState({ loading, error, empty, emptyText, onRetry }: { loading: boolean; error: string | null; empty: boolean; emptyText: string; onRetry: () => void }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 font-mono text-xs text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border-2 border-accent-coral bg-accent-coral/10 p-4 font-mono text-xs text-accent-coral">
        {error}{" "}
        <button type="button" onClick={onRetry} className="font-bold underline">
          Try again
        </button>
      </div>
    );
  }
  if (empty) return <p className="py-6 text-center font-mono text-xs text-muted">{emptyText}</p>;
  return null;
}

/** One row in a list: a title with details, then the visible toggle, edit button and the reorder/delete controls. */
export function ItemRow({
  title, subtitle, badges, visible, onToggleVisible, onEdit, controls, leading,
}: {
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  /** Undefined means the item has no visible/hidden state. */
  visible?: boolean;
  onToggleVisible?: () => void;
  onEdit: () => void;
  controls: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border-2 border-line bg-surface-2/50 p-3 ${visible === false ? "opacity-60" : ""}`}>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-bold text-foreground">{title || "Untitled"}</p>
          {badges}
        </div>
        {subtitle ? <p className="truncate font-mono text-[11px] text-muted">{subtitle}</p> : null}
      </div>
      {onToggleVisible ? (
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? `Hide ${title}` : `Show ${title}`}
          title={visible ? "Shown on the site. Click to hide." : "Hidden. Click to show."}
          className="rounded-lg border border-line bg-surface-2 p-1.5 text-muted hover:bg-cream hover:text-foreground"
        >
          {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${title}`}
        className="rounded-lg border border-line bg-surface-2 p-1.5 text-muted hover:bg-cream hover:text-primary"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      {controls}
    </div>
  );
}

export function describeError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : fallback;
}

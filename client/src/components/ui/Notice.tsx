"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";

export interface NoticeState {
  id: number;
  kind: "success" | "error";
  text: string;
}

/** A short message that goes away by itself after a few seconds. */
export function useNotice(durationMs = 4500) {
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const counter = useRef(0);
  const timer = useRef<number | null>(null);

  const dismiss = useCallback(() => setNotice(null), []);

  const show = useCallback(
    (kind: NoticeState["kind"], text: string) => {
      counter.current += 1;
      setNotice({ id: counter.current, kind, text });
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setNotice(null), durationMs);
    },
    [durationMs],
  );

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  return { notice, show, dismiss };
}

/** Renders the notice from useNotice. Always mounted, so screen readers announce a new message. */
export function Notice({ notice, onDismiss }: { notice: NoticeState | null; onDismiss: () => void }) {
  return (
    <div aria-live="polite" className="mt-4">
      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-xl border-2 p-3 font-mono text-xs ${
            notice.kind === "error"
              ? "border-accent-coral bg-accent-coral/10 text-accent-coral"
              : "border-accent-mint bg-accent-mint/15 text-foreground"
          }`}
        >
          {notice.kind === "error" ? (
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-mint" aria-hidden="true" />
          )}
          <span className="flex-1">{notice.text}</span>
          <button type="button" onClick={onDismiss} aria-label="Dismiss" className="cursor-pointer opacity-70 hover:opacity-100">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  /** "danger" colours the confirm button red, for actions that are hard or impossible to undo. */
  tone?: "default" | "danger";
  /** A request is running: the buttons are disabled and a spinner shows. */
  busy?: boolean;
  /** When set, the confirm button stays off until this exact text is typed (case-insensitive). */
  requireText?: string;
  /** Shown under the box when the server refused the action. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Replaces window.confirm: says what will happen, and for the worst actions makes the person type a word to continue. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  // The typed text starts empty every time the dialog opens: it is remounted by the key below.
  return <ConfirmDialogBody key={props.open ? "open" : "closed"} {...props} />;
}

function ConfirmDialogBody({
  open,
  title,
  message,
  confirmLabel,
  tone = "default",
  busy = false,
  requireText,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const confirmed = !requireText || typed.trim().toLowerCase() === requireText.trim().toLowerCase();

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      busy={busy}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="neo-button-secondary cursor-pointer px-4 py-2 font-mono text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || !confirmed}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-[10px] border-2 border-line px-4 py-2 font-mono text-xs font-bold shadow-[3px_3px_0px_var(--shadow-color)] transition-all hover:-translate-x-px hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 ${
              tone === "danger" ? "bg-accent-coral text-neutral-950" : "bg-primary text-white"
            }`}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-foreground">{message}</div>

      {requireText && (
        <label className="mt-4 block font-mono text-xs">
          <span className="font-bold text-foreground">
            Type <span className="rounded bg-surface-2 px-1 text-accent-coral">{requireText}</span> to confirm
          </span>
          <input
            type="text"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={busy}
            className="neo-input mt-1.5 h-10 w-full px-3 text-sm outline-none"
          />
        </label>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl border-2 border-accent-coral bg-accent-coral/10 p-3 font-mono text-xs text-accent-coral">
          {error}
        </p>
      )}
    </Modal>
  );
}

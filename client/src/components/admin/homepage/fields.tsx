"use client";

import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Loader2, Trash2, Upload } from "lucide-react";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { FormField, inputClass } from "@/components/ui/FormField";
import { uploadMedia } from "@/lib/api-client";

/** Server validation messages by field path, lower-cased (for example "links[0].url"), so lookups ignore case. */
export type FieldErrors = Record<string, string[]>;

export function normalizeErrors(raw: Record<string, string[]>): FieldErrors {
  const out: FieldErrors = {};
  for (const [key, value] of Object.entries(raw)) out[key.toLowerCase()] = value;
  return out;
}

export function errorOf(errors: FieldErrors | undefined, path: string): string | undefined {
  return errors?.[path.toLowerCase()]?.[0];
}

interface BaseProps {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({
  label, hint, error, value, onChange, placeholder, maxLength, type = "text", disabled,
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: "text" | "url" | "email";
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id} hint={hint} error={error}>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </FormField>
  );
}

export function TextAreaField({
  label, hint, error, value, onChange, rows = 4, maxLength, placeholder,
}: BaseProps & { value: string; onChange: (value: string) => void; rows?: number; maxLength?: number; placeholder?: string }) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id} hint={hint} error={error}>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="neo-input w-full resize-y p-3 text-sm leading-relaxed outline-none placeholder:text-muted/60"
      />
      {maxLength ? (
        <p className="mt-1 text-right text-[10px] text-muted">
          {value.length}/{maxLength}
        </p>
      ) : null}
    </FormField>
  );
}

export function SelectField({
  label, hint, error, value, options, onChange,
}: BaseProps & { value: string; options: DropdownOption[]; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id} hint={hint} error={error}>
      <Dropdown value={value} options={options} onChange={onChange} ariaLabel={label} />
    </FormField>
  );
}

/** An on/off switch with a label and a line of explanation. */
export function ToggleField({
  label, description, checked, onChange,
}: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 font-mono text-xs">
      <div>
        <label htmlFor={id} className="block cursor-pointer font-bold text-foreground">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-[11px] text-muted">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-line transition-colors ${
          checked ? "bg-primary" : "bg-surface-2"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full border border-line bg-white transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/** A framed block with a title, used to group related fields inside a tab. */
export function Panel({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl border-2 border-line bg-surface p-5 shadow-[3px_3px_0px_var(--shadow-color)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-foreground">{title}</h3>
          {description ? <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-muted">{description}</p> : null}
        </div>
        <div className="shrink-0 whitespace-nowrap">{action}</div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** Up, down and delete buttons for a row in a list. */
export function RowControls({
  index, count, onMove, onDelete, label, extra,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onDelete?: () => void;
  /** What the row is, for the buttons' accessible names ("Move GitHub up"). */
  label: string;
  extra?: ReactNode;
}) {
  const btn =
    "rounded-lg border border-line bg-surface-2 p-1.5 text-muted transition-colors enabled:hover:bg-cream enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex shrink-0 items-center gap-1">
      {extra}
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={`Move ${label} up`}>
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label={`Move ${label} down`}>
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${label}`}
          className="rounded-lg border border-line bg-surface-2 p-1.5 text-muted transition-colors hover:bg-accent-coral/10 hover:text-accent-coral"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * An address field with an Upload button next to it: the file goes to the media library and its address is filled in.
 * `accept` limits what the file picker offers (for example images, or PDF documents).
 */
export function UploadField({
  label, hint, error, value, onChange, accept, category, accessPolicy = "Public", preview,
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  accept: string;
  category: string;
  accessPolicy?: string;
  /** Shows a small picture of the current image above the field. */
  preview?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setUploadError(null);
    try {
      const media = await uploadMedia(file, category, undefined, undefined, accessPolicy);
      onChange(media.url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "The upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <FormField label={label} htmlFor={id} hint={hint} error={error ?? uploadError ?? undefined}>
      {preview && value ? (
        // A plain img: the address can be any uploaded or external file, not only one Next.js has been told about.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mb-2 h-20 w-20 rounded-xl border-2 border-line object-cover" />
      ) : null}
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or /path"
          aria-invalid={error ? true : undefined}
          className={inputClass}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="neo-button-secondary inline-flex shrink-0 items-center gap-1.5 px-3 text-xs font-bold disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload
        </button>
        <input ref={inputRef} type="file" accept={accept} hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>
    </FormField>
  );
}

/** A row of removable chips with a box to add more (used for the core stack and project tags). */
export function ChipsField({
  label, hint, error, values, onChange, max, placeholder = "Type and press Enter",
}: BaseProps & { values: string[]; onChange: (values: string[]) => void; max: number; placeholder?: string }) {
  const id = useId();
  const [draft, setDraft] = useState("");

  const add = () => {
    // Several can be pasted at once, separated by commas.
    const parts = draft.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    onChange([...values, ...parts].slice(0, max));
    setDraft("");
  };

  return (
    <FormField label={label} htmlFor={id} hint={hint ?? `Up to ${max}. Press Enter to add.`} error={error}>
      <div className="mb-2 flex flex-wrap gap-2">
        {values.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-line bg-surface-2 py-0.5 pr-1 pl-2.5 text-xs font-bold text-foreground"
          >
            {value}
            <button
              type="button"
              onClick={() => onChange(values.filter((_, i) => i !== index))}
              aria-label={`Remove ${value}`}
              className="rounded p-0.5 text-muted hover:bg-accent-coral/10 hover:text-accent-coral"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        id={id}
        value={draft}
        placeholder={placeholder}
        disabled={values.length >= max}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        className={inputClass}
      />
    </FormField>
  );
}

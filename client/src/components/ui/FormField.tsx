import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  /** Id of the input inside, so the label is connected to it. */
  htmlFor: string;
  /** Message from validation, shown under the input in red. */
  error?: string;
  hint?: string;
  children: ReactNode;
}

/** A label, an input slot, an optional hint, and an error message. Keeps every form looking the same. */
export function FormField({ label, htmlFor, error, hint, children }: FormFieldProps) {
  return (
    <div className="font-mono text-xs">
      <label htmlFor={htmlFor} className="mb-1.5 block font-bold text-foreground">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-[11px] text-muted">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-[11px] font-bold text-accent-coral">
          {error}
        </p>
      )}
    </div>
  );
}

/** Class for a text input inside a FormField. */
export const inputClass =
  "neo-input h-11 w-full px-3 text-sm outline-none placeholder:text-muted/60 disabled:cursor-not-allowed disabled:opacity-60";

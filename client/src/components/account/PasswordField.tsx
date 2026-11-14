"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FormField, inputClass } from "@/components/ui/FormField";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  /** "current-password" for sign-in, "new-password" when choosing one, so password managers do the right thing. */
  autoComplete: "current-password" | "new-password";
  disabled?: boolean;
}

/** The password rule the server enforces, shown under every "choose a password" field. */
export const PASSWORD_HINT = "At least 8 characters, with a number and a lowercase letter.";

/** Checks a new password the way the server will, so mistakes show before the request is sent. */
export function passwordProblem(password: string): string | undefined {
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/\d/.test(password)) return "Password must contain a number.";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
  return undefined;
}

/** A password input with a show/hide button. */
export function PasswordField({ id, label, value, onChange, error, hint, autoComplete, disabled }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField label={label} htmlFor={id} error={error} hint={hint}>
      <div className="relative flex items-center">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={disabled}
          className={`${inputClass} pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 cursor-pointer p-1 text-muted transition-colors hover:text-foreground focus:outline-none"
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FormField>
  );
}

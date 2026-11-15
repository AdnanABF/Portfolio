"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { FormField, inputClass } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { ApiError, createMember, updateMember } from "@/lib/api-client";
import type { MemberActionResult, MemberFormValues, MemberItem } from "@/lib/types";
import { useAuthErrorHandler } from "./memberUi";

interface MemberFormModalProps {
  /** Without a member the form adds a new one (and sends an invite); with one it edits that member. */
  member?: MemberItem;
  onClose: () => void;
  onSaved: (result: MemberActionResult, mode: "create" | "edit") => void;
}

const ROLE_CHOICES = [
  { value: "Member", label: "Member" },
  { value: "Admin", label: "Admin" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Add or edit a member. Server messages (for example "email already used") appear under the right field. */
export function MemberFormModal({ member, onClose, onSaved }: MemberFormModalProps) {
  const editing = Boolean(member);
  const handleAuthError = useAuthErrorHandler();

  const [values, setValues] = useState<MemberFormValues>({
    fullName: member?.fullName ?? "",
    email: member?.email ?? "",
    role: member?.role === "Admin" ? "Admin" : "Member",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof MemberFormValues | "form", string>>>({});
  const [busy, setBusy] = useState(false);

  const emailChanged = editing && member!.email.toLowerCase() !== values.email.trim().toLowerCase();

  const validate = () => {
    const next: typeof errors = {};
    if (!values.fullName.trim()) next.fullName = "Name is required.";
    else if (values.fullName.trim().length > 100) next.fullName = "Name must not exceed 100 characters.";
    if (!values.email.trim()) next.email = "Email is required.";
    else if (!EMAIL_PATTERN.test(values.email.trim())) next.email = "Enter a valid email address.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !validate()) return;

    setBusy(true);
    setErrors({});
    try {
      const payload = { ...values, fullName: values.fullName.trim(), email: values.email.trim() };
      const result = editing ? await updateMember(member!.id, payload) : await createMember(payload);
      onSaved(result, editing ? "edit" : "create");
    } catch (error) {
      if (handleAuthError(error)) return;
      if (error instanceof ApiError) {
        setErrors({
          fullName: error.fieldErrors.fullName?.[0],
          email: error.fieldErrors.email?.[0],
          role: error.fieldErrors.role?.[0],
          form: Object.keys(error.fieldErrors).length === 0 ? error.message : undefined,
        });
      } else {
        setErrors({ form: "Something went wrong. Please try again." });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      busy={busy}
      title={editing ? "Edit member" : "Add member"}
      description={editing ? member!.email : "They get an email with a link to set their own password."}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="neo-button-secondary cursor-pointer px-4 py-2 font-mono text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="member-form"
            disabled={busy}
            className="neo-button-primary inline-flex cursor-pointer items-center gap-2 px-4 py-2 font-mono text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {editing ? "Save changes" : "Add and send invite"}
          </button>
        </>
      }
    >
      <form id="member-form" onSubmit={submit} noValidate className="space-y-4">
        {errors.form && (
          <p role="alert" className="rounded-xl border-2 border-accent-coral bg-accent-coral/10 p-3 font-mono text-xs text-accent-coral">
            {errors.form}
          </p>
        )}

        <FormField label="Full name" htmlFor="member-name" error={errors.fullName}>
          <input
            id="member-name"
            type="text"
            value={values.fullName}
            onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
            maxLength={100}
            autoComplete="off"
            aria-invalid={Boolean(errors.fullName)}
            disabled={busy}
            className={inputClass}
          />
        </FormField>

        <FormField
          label="Email (also the username)"
          htmlFor="member-email"
          error={errors.email}
          hint={emailChanged ? "Changing the email signs the member out and they must confirm the new address." : undefined}
        >
          <input
            id="member-email"
            type="email"
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            maxLength={150}
            autoComplete="off"
            autoCapitalize="none"
            aria-invalid={Boolean(errors.email)}
            disabled={busy}
            className={inputClass}
          />
        </FormField>

        <FormField
          label="Role"
          htmlFor="member-role"
          error={errors.role}
          hint="Members have no admin access. Admins can use the admin area (not this panel)."
        >
          <Dropdown
            ariaLabel="Role"
            value={values.role}
            options={ROLE_CHOICES}
            disabled={busy}
            onChange={(value) => setValues((v) => ({ ...v, role: value === "Admin" ? "Admin" : "Member" }))}
          />
        </FormField>
      </form>
    </Modal>
  );
}

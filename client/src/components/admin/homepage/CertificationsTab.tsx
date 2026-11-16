"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ApiError, deleteCertification, getAdminCertifications, reorderCertifications, saveCertification } from "@/lib/api-client";
import type { AdminCertification } from "@/lib/types";
import { Panel, RowControls, TextField, ToggleField, errorOf, moveItem, normalizeErrors, type FieldErrors } from "./fields";
import { ItemRow, ListState, describeError, useEditableList } from "./listSupport";

interface Props {
  onAuthError: () => void;
  onChanged: () => void;
  onMessage: (kind: "success" | "error", text: string) => void;
}

type Values = Omit<AdminCertification, "id">;

const BLANK: Values = { title: "", issuer: "", issuedOn: "", credentialUrl: "", sortOrder: 0, isVisible: true };

/** Certifications and courses: add, edit, hide, reorder and delete. Changes save immediately. */
export function CertificationsTab({ onAuthError, onChanged, onMessage }: Props) {
  const { items, setItems, loading, error, reload } = useEditableList(getAdminCertifications, onAuthError);
  const [editing, setEditing] = useState<{ id: string | null; values: Values } | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [toDelete, setToDelete] = useState<AdminCertification | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fail = (e: unknown, fallback: string) => onMessage("error", describeError(e, fallback));

  const move = async (from: number, to: number) => {
    const next = moveItem(items, from, to);
    setItems(next);
    try {
      await reorderCertifications(next.map((i) => i.id));
      onChanged();
    } catch (e) {
      fail(e, "Could not save the new order.");
      void reload();
    }
  };

  const toggleVisible = async (item: AdminCertification) => {
    try {
      const { id, ...rest } = item;
      const saved = await saveCertification(id, { ...rest, isVisible: !item.isVisible });
      setItems(items.map((i) => (i.id === id ? saved : i)));
      onChanged();
    } catch (e) {
      fail(e, "Could not change visibility.");
    }
  };

  const submit = async () => {
    if (!editing) return;
    setSaving(true);
    setFieldErrors({});
    try {
      const sortOrder = editing.id ? editing.values.sortOrder : items.length;
      const saved = await saveCertification(editing.id, { ...editing.values, sortOrder });
      setItems(editing.id ? items.map((i) => (i.id === saved.id ? saved : i)) : [...items, saved]);
      setEditing(null);
      onMessage("success", editing.id ? "Certification saved." : "Certification added.");
      onChanged();
    } catch (e) {
      if (e instanceof ApiError) setFieldErrors(normalizeErrors(e.fieldErrors));
      fail(e, "Could not save the certification.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteCertification(toDelete.id);
      setItems(items.filter((i) => i.id !== toDelete.id));
      setToDelete(null);
      onMessage("success", "Certification deleted.");
      onChanged();
    } catch (e) {
      fail(e, "Could not delete the certification.");
    } finally {
      setDeleting(false);
    }
  };

  const set = (patch: Partial<Values>) => setEditing((cur) => (cur ? { ...cur, values: { ...cur.values, ...patch } } : cur));

  return (
    <Panel
      title="Certifications"
      description="Shown in the Certifications section, in this order. Changes here save immediately."
      action={
        <button type="button" onClick={() => setEditing({ id: null, values: { ...BLANK } })} className="neo-button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      }
    >
      <ListState loading={loading} error={error} empty={items.length === 0} emptyText="No certifications yet. The section stays hidden until there is one." onRetry={reload} />
      <div className="space-y-2">
        {items.map((item, index) => (
          <ItemRow
            key={item.id}
            title={item.title}
            subtitle={[item.issuer, item.issuedOn].filter(Boolean).join(" · ")}
            visible={item.isVisible}
            onToggleVisible={() => toggleVisible(item)}
            onEdit={() => setEditing({ id: item.id, values: { ...item } })}
            controls={<RowControls index={index} count={items.length} label={item.title} onMove={move} onDelete={() => setToDelete(item)} />}
          />
        ))}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        busy={saving}
        title={editing?.id ? "Edit certification" : "Add certification"}
        footer={
          <>
            <button type="button" onClick={() => setEditing(null)} disabled={saving} className="neo-button-secondary px-4 py-2 text-xs">
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={saving} className="neo-button-primary inline-flex items-center gap-2 px-4 py-2 text-xs">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save
            </button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            <TextField label="Title" value={editing.values.title} maxLength={200} onChange={(title) => set({ title })} error={errorOf(fieldErrors, "title")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Issued by" value={editing.values.issuer} maxLength={150} onChange={(issuer) => set({ issuer })} error={errorOf(fieldErrors, "issuer")} />
              <TextField label="Date" hint='For example "January 2026".' value={editing.values.issuedOn} maxLength={100} onChange={(issuedOn) => set({ issuedOn })} error={errorOf(fieldErrors, "issuedOn")} />
            </div>
            <TextField label="Credential link" hint="Optional. Leave empty to hide the link." type="url" placeholder="https://…" value={editing.values.credentialUrl} maxLength={500} onChange={(credentialUrl) => set({ credentialUrl })} error={errorOf(fieldErrors, "credentialUrl")} />
            <ToggleField label="Show on the site" checked={editing.values.isVisible} onChange={(isVisible) => set({ isVisible })} />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this certification?"
        message={<>{toDelete?.title} will be removed. This cannot be undone. To keep it but not show it, hide it instead.</>}
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Panel>
  );
}

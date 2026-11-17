"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ApiError, deleteEducation, getAdminEducation, reorderEducation, saveEducation } from "@/lib/api-client";
import type { AdminEducation } from "@/lib/types";
import { Panel, RowControls, TextAreaField, TextField, ToggleField, errorOf, moveItem, normalizeErrors, type FieldErrors } from "./fields";
import { ItemRow, ListState, describeError, useEditableList } from "./listSupport";

interface Props {
  onAuthError: () => void;
  /** Called after any save so the preview can reload its lists. */
  onChanged: () => void;
  onMessage: (kind: "success" | "error", text: string) => void;
}

type Values = Omit<AdminEducation, "id">;

const BLANK: Values = { institution: "", qualification: "", location: "", period: "", details: [], sortOrder: 0, isVisible: true };

/** Education: schools, colleges and universities, newest first as you order them. Changes save immediately. */
export function EducationTab({ onAuthError, onChanged, onMessage }: Props) {
  const { items, setItems, loading, error, reload } = useEditableList(getAdminEducation, onAuthError);
  const [editing, setEditing] = useState<{ id: string | null; values: Values; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [toDelete, setToDelete] = useState<AdminEducation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fail = (e: unknown, fallback: string) => onMessage("error", describeError(e, fallback));

  const move = async (from: number, to: number) => {
    const next = moveItem(items, from, to);
    setItems(next);
    try {
      await reorderEducation(next.map((i) => i.id));
      onChanged();
    } catch (e) {
      fail(e, "Could not save the new order.");
      void reload();
    }
  };

  const toggleVisible = async (item: AdminEducation) => {
    try {
      const { id, ...rest } = item;
      const saved = await saveEducation(id, { ...rest, isVisible: !item.isVisible });
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
      const details = editing.text.split("\n").map((l) => l.trim()).filter(Boolean);
      const sortOrder = editing.id ? editing.values.sortOrder : items.length;
      const saved = await saveEducation(editing.id, { ...editing.values, details, sortOrder });
      setItems(editing.id ? items.map((i) => (i.id === saved.id ? saved : i)) : [...items, saved]);
      setEditing(null);
      onMessage("success", editing.id ? "Education entry saved." : "Education entry added.");
      onChanged();
    } catch (e) {
      if (e instanceof ApiError) setFieldErrors(normalizeErrors(e.fieldErrors));
      fail(e, "Could not save the education entry.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteEducation(toDelete.id);
      setItems(items.filter((i) => i.id !== toDelete.id));
      setToDelete(null);
      onMessage("success", "Education entry deleted.");
      onChanged();
    } catch (e) {
      fail(e, "Could not delete the education entry.");
    } finally {
      setDeleting(false);
    }
  };

  const set = (patch: Partial<Values>) => setEditing((cur) => (cur ? { ...cur, values: { ...cur.values, ...patch } } : cur));

  return (
    <Panel
      title="Education"
      description="Shown in the Education section as a timeline, in this order. Add every school or course you want to show. Changes here save immediately."
      action={
        <button type="button" onClick={() => setEditing({ id: null, values: { ...BLANK }, text: "" })} className="neo-button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      }
    >
      <ListState loading={loading} error={error} empty={items.length === 0} emptyText="No education entries yet. The section stays hidden until there is one." onRetry={reload} />
      <div className="space-y-2">
        {items.map((item, index) => (
          <ItemRow
            key={item.id}
            title={item.qualification}
            subtitle={[item.institution, item.period].filter(Boolean).join(" · ")}
            visible={item.isVisible}
            onToggleVisible={() => toggleVisible(item)}
            onEdit={() => setEditing({ id: item.id, values: { ...item }, text: item.details.join("\n") })}
            controls={<RowControls index={index} count={items.length} label={item.qualification} onMove={move} onDelete={() => setToDelete(item)} />}
          />
        ))}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        busy={saving}
        title={editing?.id ? "Edit education" : "Add education"}
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
            <TextField label="Qualification" hint='For example "Bachelor of Technology in Information Technology" or "Higher Secondary".' value={editing.values.qualification} maxLength={150} onChange={(qualification) => set({ qualification })} error={errorOf(fieldErrors, "qualification")} />
            <TextField label="School, college or university" value={editing.values.institution} maxLength={150} onChange={(institution) => set({ institution })} error={errorOf(fieldErrors, "institution")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Period" hint='For example "2018 - 2022".' value={editing.values.period} maxLength={100} onChange={(period) => set({ period })} error={errorOf(fieldErrors, "period")} />
              <TextField label="Location" value={editing.values.location} maxLength={100} onChange={(location) => set({ location })} error={errorOf(fieldErrors, "location")} />
            </div>
            <TextAreaField label="Details" hint="Optional, one per line. Shown when the entry is expanded (university, grade, activities, projects)." rows={5} value={editing.text} onChange={(text) => setEditing({ ...editing, text })} error={errorOf(fieldErrors, "details")} />
            <ToggleField label="Show on the site" checked={editing.values.isVisible} onChange={(isVisible) => set({ isVisible })} />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this education entry?"
        message={<>{toDelete?.qualification} at {toDelete?.institution} will be removed. This cannot be undone. To keep it but not show it, hide it instead.</>}
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Panel>
  );
}

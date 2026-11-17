"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ApiError, deleteExperience, getAdminExperience, reorderExperience, saveExperience } from "@/lib/api-client";
import type { AdminExperience } from "@/lib/types";
import { Panel, RowControls, TextAreaField, TextField, ToggleField, errorOf, moveItem, normalizeErrors, type FieldErrors } from "./fields";
import { ItemRow, ListState, describeError, useEditableList } from "./listSupport";

interface Props {
  onAuthError: () => void;
  /** Called after any save so the preview can reload its lists. */
  onChanged: () => void;
  onMessage: (kind: "success" | "error", text: string) => void;
}

const BLANK: Omit<AdminExperience, "id"> = { role: "", company: "", location: "", period: "", achievements: [], sortOrder: 0, isVisible: true };

/** Work experience: add, edit, hide, reorder and delete. These save straight away (they are not part of the draft). */
export function ExperienceTab({ onAuthError, onChanged, onMessage }: Props) {
  const { items, setItems, loading, error, reload } = useEditableList(getAdminExperience, onAuthError);
  const [editing, setEditing] = useState<{ id: string | null; values: Omit<AdminExperience, "id">; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [toDelete, setToDelete] = useState<AdminExperience | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fail = (e: unknown, fallback: string) => onMessage("error", describeError(e, fallback));

  const move = async (from: number, to: number) => {
    const next = moveItem(items, from, to);
    setItems(next);
    try {
      await reorderExperience(next.map((i) => i.id));
      onChanged();
    } catch (e) {
      fail(e, "Could not save the new order.");
      void reload();
    }
  };

  const toggleVisible = async (item: AdminExperience) => {
    try {
      const { id, ...rest } = item;
      const saved = await saveExperience(id, { ...rest, isVisible: !item.isVisible });
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
      const achievements = editing.text.split("\n").map((l) => l.trim()).filter(Boolean);
      const sortOrder = editing.id ? editing.values.sortOrder : items.length;
      const saved = await saveExperience(editing.id, { ...editing.values, achievements, sortOrder });
      setItems(editing.id ? items.map((i) => (i.id === saved.id ? saved : i)) : [...items, saved]);
      setEditing(null);
      onMessage("success", editing.id ? "Experience entry saved." : "Experience entry added.");
      onChanged();
    } catch (e) {
      if (e instanceof ApiError) setFieldErrors(normalizeErrors(e.fieldErrors));
      fail(e, "Could not save the experience entry.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteExperience(toDelete.id);
      setItems(items.filter((i) => i.id !== toDelete.id));
      setToDelete(null);
      onMessage("success", "Experience entry deleted.");
      onChanged();
    } catch (e) {
      fail(e, "Could not delete the experience entry.");
    } finally {
      setDeleting(false);
    }
  };

  const set = (patch: Partial<Omit<AdminExperience, "id">>) => setEditing((cur) => (cur ? { ...cur, values: { ...cur.values, ...patch } } : cur));

  return (
    <Panel
      title="Work experience"
      description="Shown in the Experience section, in this order. Hidden entries stay here but not on the site. Changes here save immediately."
      action={
        <button type="button" onClick={() => setEditing({ id: null, values: { ...BLANK }, text: "" })} className="neo-button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      }
    >
      <ListState loading={loading} error={error} empty={items.length === 0} emptyText="No experience entries yet." onRetry={reload} />
      <div className="space-y-2">
        {items.map((item, index) => (
          <ItemRow
            key={item.id}
            title={item.role}
            subtitle={`${item.company} · ${item.period}`}
            visible={item.isVisible}
            onToggleVisible={() => toggleVisible(item)}
            onEdit={() => setEditing({ id: item.id, values: { ...item }, text: item.achievements.join("\n") })}
            controls={<RowControls index={index} count={items.length} label={item.role} onMove={move} onDelete={() => setToDelete(item)} />}
          />
        ))}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        busy={saving}
        title={editing?.id ? "Edit experience" : "Add experience"}
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
            <TextField label="Role" value={editing.values.role} maxLength={150} onChange={(role) => set({ role })} error={errorOf(fieldErrors, "role")} />
            <TextField label="Company" value={editing.values.company} maxLength={150} onChange={(company) => set({ company })} error={errorOf(fieldErrors, "company")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Period" hint='For example "August 2022 - December 2023".' value={editing.values.period} maxLength={100} onChange={(period) => set({ period })} error={errorOf(fieldErrors, "period")} />
              <TextField label="Location" value={editing.values.location} maxLength={150} onChange={(location) => set({ location })} error={errorOf(fieldErrors, "location")} />
            </div>
            <TextAreaField label="Achievements" hint="One per line." rows={8} value={editing.text} onChange={(text) => setEditing({ ...editing, text })} error={errorOf(fieldErrors, "achievements")} />
            <ToggleField label="Show on the site" checked={editing.values.isVisible} onChange={(isVisible) => set({ isVisible })} />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this experience entry?"
        message={<>{toDelete?.role} at {toDelete?.company} will be removed. This cannot be undone. To keep it but not show it, hide it instead.</>}
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Panel>
  );
}

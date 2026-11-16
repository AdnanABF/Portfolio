"use client";

import { useMemo, useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ApiError, deleteSkill, getAdminSkills, reorderSkills, saveSkill } from "@/lib/api-client";
import type { AdminSkill } from "@/lib/types";
import { Panel, RowControls, TextAreaField, TextField, ToggleField, errorOf, moveItem, normalizeErrors, type FieldErrors } from "./fields";
import { ItemRow, ListState, describeError, useEditableList } from "./listSupport";

interface Props {
  onAuthError: () => void;
  onChanged: () => void;
  onMessage: (kind: "success" | "error", text: string) => void;
}

type Editing =
  | { mode: "add"; category: string; names: string }
  | { mode: "edit"; skill: AdminSkill };

/**
 * Skills grouped by category, as in the CV. A skill has only a category and a name (no percentages).
 * Reorder skills inside a category, or move a whole category up or down. Changes here save immediately.
 */
export function SkillsTab({ onAuthError, onChanged, onMessage }: Props) {
  const { items, setItems, loading, error, reload } = useEditableList(getAdminSkills, onAuthError);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [toDelete, setToDelete] = useState<AdminSkill | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null);

  // Categories in the order their first skill appears, each with its skills in order.
  const groups = useMemo(() => {
    const map = new Map<string, AdminSkill[]>();
    for (const skill of items) map.set(skill.category, [...(map.get(skill.category) ?? []), skill]);
    return Array.from(map.entries());
  }, [items]);
  const categories = groups.map(([name]) => name);

  const fail = (e: unknown, fallback: string) => onMessage("error", describeError(e, fallback));

  const applyOrder = async (next: AdminSkill[]) => {
    setItems(next);
    try {
      await reorderSkills(next.map((s) => s.id));
      onChanged();
    } catch (e) {
      fail(e, "Could not save the new order.");
      void reload();
    }
  };

  const moveSkill = (skill: AdminSkill, direction: -1 | 1) => {
    const group = groups.find(([name]) => name === skill.category)?.[1] ?? [];
    const target = group[group.findIndex((s) => s.id === skill.id) + direction];
    if (!target) return;
    const from = items.findIndex((s) => s.id === skill.id);
    const to = items.findIndex((s) => s.id === target.id);
    void applyOrder(moveItem(items, from, to));
  };

  const moveCategory = (index: number, direction: -1 | 1) => {
    const swapped = moveItem(groups, index, index + direction);
    if (swapped === groups) return;
    void applyOrder(swapped.flatMap(([, skills]) => skills));
  };

  const toggleVisible = async (skill: AdminSkill) => {
    try {
      const { id, ...rest } = skill;
      const saved = await saveSkill(id, { ...rest, isVisible: !skill.isVisible });
      setItems(items.map((s) => (s.id === id ? saved : s)));
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
      if (editing.mode === "edit") {
        const { id, ...rest } = editing.skill;
        const saved = await saveSkill(id, rest);
        setItems(items.map((s) => (s.id === id ? saved : s)));
        onMessage("success", "Skill saved.");
      } else {
        const names = editing.names.split("\n").map((n) => n.trim()).filter(Boolean);
        if (!editing.category.trim() || names.length === 0) {
          setFieldErrors({ names: ["Enter a category and at least one skill."] });
          return;
        }
        const created: AdminSkill[] = [];
        let order = items.length;
        for (const name of names) {
          created.push(await saveSkill(null, { category: editing.category.trim(), name, sortOrder: order++, isVisible: true, iconName: null }));
        }
        setItems([...items, ...created]);
        onMessage("success", created.length === 1 ? "Skill added." : `${created.length} skills added.`);
      }
      setEditing(null);
      onChanged();
    } catch (e) {
      if (e instanceof ApiError) setFieldErrors(normalizeErrors(e.fieldErrors));
      fail(e, "Could not save the skill.");
      void reload();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteSkill(toDelete.id);
      setItems(items.filter((s) => s.id !== toDelete.id));
      setToDelete(null);
      onChanged();
    } catch (e) {
      fail(e, "Could not delete the skill.");
    } finally {
      setDeleting(false);
    }
  };

  const submitRename = async () => {
    if (!renaming || !renaming.to.trim()) return;
    setSaving(true);
    try {
      const updated: AdminSkill[] = [];
      for (const skill of items.filter((s) => s.category === renaming.from)) {
        const { id, ...rest } = skill;
        updated.push(await saveSkill(id, { ...rest, category: renaming.to.trim() }));
      }
      setItems(items.map((s) => updated.find((u) => u.id === s.id) ?? s));
      setRenaming(null);
      onMessage("success", "Category renamed.");
      onChanged();
    } catch (e) {
      fail(e, "Could not rename the category.");
      void reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Panel
        title="Skills"
        description="Grouped by category, as in your CV. Changes here save immediately."
        action={
          <button type="button" onClick={() => setEditing({ mode: "add", category: categories[0] ?? "", names: "" })} className="neo-button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add skills
          </button>
        }
      >
        <ListState loading={loading} error={error} empty={items.length === 0} emptyText="No skills yet." onRetry={reload} />
        {groups.map(([category, skills], groupIndex) => (
          <div key={category} className="space-y-2 rounded-xl border-2 border-line p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h4 className="font-mono text-xs font-extrabold text-primary">/ {category}</h4>
                <button type="button" onClick={() => setRenaming({ from: category, to: category })} aria-label={`Rename ${category}`} className="rounded p-1 text-muted hover:text-primary">
                  <Pencil className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => setEditing({ mode: "add", category, names: "" })} className="rounded-lg border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-bold text-primary hover:bg-cream">
                  + Add
                </button>
              </div>
              <RowControls index={groupIndex} count={groups.length} label={`category ${category}`} onMove={(from, to) => moveCategory(from, to > from ? 1 : -1)} />
            </div>
            {skills.map((skill, index) => (
              <ItemRow
                key={skill.id}
                title={skill.name}
                visible={skill.isVisible}
                onToggleVisible={() => toggleVisible(skill)}
                onEdit={() => setEditing({ mode: "edit", skill })}
                controls={<RowControls index={index} count={skills.length} label={skill.name} onMove={(from, to) => moveSkill(skill, to > from ? 1 : -1)} onDelete={() => setToDelete(skill)} />}
              />
            ))}
          </div>
        ))}
      </Panel>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        busy={saving}
        title={editing?.mode === "edit" ? "Edit skill" : "Add skills"}
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
        {editing?.mode === "edit" ? (
          <div className="space-y-4">
            <TextField label="Category" value={editing.skill.category} maxLength={50} onChange={(category) => setEditing({ mode: "edit", skill: { ...editing.skill, category } })} error={errorOf(fieldErrors, "category")} />
            <TextField label="Name" value={editing.skill.name} maxLength={100} onChange={(name) => setEditing({ mode: "edit", skill: { ...editing.skill, name } })} error={errorOf(fieldErrors, "name")} />
            <ToggleField label="Show on the site" checked={editing.skill.isVisible} onChange={(isVisible) => setEditing({ mode: "edit", skill: { ...editing.skill, isVisible } })} />
          </div>
        ) : editing ? (
          <div className="space-y-4">
            <TextField label="Category" hint="Pick an existing one or type a new one." value={editing.category} maxLength={50} onChange={(category) => setEditing({ ...editing, category })} error={errorOf(fieldErrors, "category")} />
            {categories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button key={c} type="button" onClick={() => setEditing({ ...editing, category: c })} className="rounded-lg border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-muted hover:bg-cream hover:text-foreground">
                    {c}
                  </button>
                ))}
              </div>
            ) : null}
            <TextAreaField label="Skills" hint="One per line." rows={6} value={editing.names} onChange={(names) => setEditing({ ...editing, names })} error={errorOf(fieldErrors, "names")} />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        busy={saving}
        size="sm"
        title="Rename category"
        footer={
          <>
            <button type="button" onClick={() => setRenaming(null)} disabled={saving} className="neo-button-secondary px-4 py-2 text-xs">
              Cancel
            </button>
            <button type="button" onClick={submitRename} disabled={saving || !renaming?.to.trim()} className="neo-button-primary px-4 py-2 text-xs">
              Rename
            </button>
          </>
        }
      >
        {renaming ? <TextField label="New name" value={renaming.to} maxLength={50} onChange={(to) => setRenaming({ ...renaming, to })} /> : null}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this skill?"
        message={<>{toDelete?.name} will be removed. To keep it but not show it, hide it instead.</>}
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Loader2, Lock, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ApiError, deleteProject, getAdminProjects, reorderProjects, saveProject } from "@/lib/api-client";
import type { AdminProject } from "@/lib/types";
import { ChipsField, Panel, RowControls, TextAreaField, TextField, ToggleField, UploadField, errorOf, moveItem, normalizeErrors, type FieldErrors } from "./fields";
import { ItemRow, ListState, describeError, useEditableList } from "./listSupport";

interface Props {
  onAuthError: () => void;
  onChanged: () => void;
  onMessage: (kind: "success" | "error", text: string) => void;
}

type Values = Omit<AdminProject, "id" | "updatedAt">;

const BLANK: Values = {
  slug: "", title: "", tagline: "", description: "", heroImageUrl: "", tags: [], screenshots: [],
  liveUrl: "", githubUrl: "", isFeatured: true, isPublished: false, isRepoPrivate: false, sortOrder: 0,
  keyMetricsJson: null, contentMarkdown: "",
};

const slugify = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const pill = "rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted";

/** Projects: add, edit, publish or keep as a draft, reorder and delete. Changes here save immediately. */
export function ProjectsTab({ onAuthError, onChanged, onMessage }: Props) {
  const { items, setItems, loading, error, reload } = useEditableList(getAdminProjects, onAuthError);
  const [editing, setEditing] = useState<{ id: string | null; values: Values; slugEdited: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [toDelete, setToDelete] = useState<AdminProject | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fail = (e: unknown, fallback: string) => onMessage("error", describeError(e, fallback));

  const move = async (from: number, to: number) => {
    const next = moveItem(items, from, to);
    setItems(next);
    try {
      await reorderProjects(next.map((p) => p.id));
      onChanged();
    } catch (e) {
      fail(e, "Could not save the new order.");
      void reload();
    }
  };

  const togglePublished = async (project: AdminProject) => {
    try {
      const { id, updatedAt: _updatedAt, ...rest } = project;
      void _updatedAt;
      const saved = await saveProject(id, { ...rest, isPublished: !project.isPublished });
      setItems(items.map((p) => (p.id === id ? saved : p)));
      onChanged();
    } catch (e) {
      fail(e, "Could not change the project.");
    }
  };

  const submit = async () => {
    if (!editing) return;
    setSaving(true);
    setFieldErrors({});
    try {
      const values = { ...editing.values, slug: editing.values.slug || slugify(editing.values.title), sortOrder: editing.id ? editing.values.sortOrder : items.length };
      const saved = await saveProject(editing.id, values);
      setItems(editing.id ? items.map((p) => (p.id === saved.id ? saved : p)) : [...items, saved]);
      setEditing(null);
      onMessage("success", editing.id ? "Project saved." : "Project added.");
      onChanged();
    } catch (e) {
      if (e instanceof ApiError) setFieldErrors(normalizeErrors(e.fieldErrors));
      fail(e, "Could not save the project.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteProject(toDelete.id);
      setItems(items.filter((p) => p.id !== toDelete.id));
      setToDelete(null);
      onMessage("success", "Project deleted.");
      onChanged();
    } catch (e) {
      fail(e, "Could not delete the project.");
    } finally {
      setDeleting(false);
    }
  };

  const set = (patch: Partial<Values>) => setEditing((cur) => (cur ? { ...cur, values: { ...cur.values, ...patch } } : cur));

  return (
    <Panel
      title="Projects"
      description="Shown in the Projects section and on their own pages, in this order. A draft is hidden from visitors. Changes here save immediately."
      action={
        <button type="button" onClick={() => setEditing({ id: null, values: { ...BLANK }, slugEdited: false })} className="neo-button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      }
    >
      <ListState loading={loading} error={error} empty={items.length === 0} emptyText="No projects yet." onRetry={reload} />
      <div className="space-y-2">
        {items.map((project, index) => (
          <ItemRow
            key={project.id}
            title={project.title}
            subtitle={project.tagline}
            visible={project.isPublished}
            onToggleVisible={() => togglePublished(project)}
            badges={
              <>
                {!project.isPublished ? <span className={pill}>Draft</span> : null}
                {project.isRepoPrivate ? (
                  <span className={`${pill} inline-flex items-center gap-1`}>
                    <Lock className="h-2.5 w-2.5" /> Private repo
                  </span>
                ) : null}
              </>
            }
            onEdit={() => setEditing({ id: project.id, values: { ...project }, slugEdited: true })}
            controls={<RowControls index={index} count={items.length} label={project.title} onMove={move} onDelete={() => setToDelete(project)} />}
          />
        ))}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        busy={saving}
        title={editing?.id ? "Edit project" : "Add project"}
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
            <TextField
              label="Title"
              value={editing.values.title}
              maxLength={200}
              onChange={(title) => setEditing({ ...editing, values: { ...editing.values, title, slug: editing.slugEdited ? editing.values.slug : slugify(title) } })}
              error={errorOf(fieldErrors, "title")}
            />
            <TextField
              label="Page address"
              hint={`The project page is at /projects/${editing.values.slug || "…"}. Lowercase letters, numbers and hyphens.`}
              value={editing.values.slug}
              maxLength={100}
              onChange={(slug) => setEditing({ ...editing, slugEdited: true, values: { ...editing.values, slug } })}
              error={errorOf(fieldErrors, "slug")}
            />
            <TextField label="Tagline" value={editing.values.tagline} maxLength={300} onChange={(tagline) => set({ tagline })} error={errorOf(fieldErrors, "tagline")} />
            <TextAreaField label="Description" rows={4} value={editing.values.description} onChange={(description) => set({ description })} error={errorOf(fieldErrors, "description")} />
            <UploadField label="Image" hint="Optional. Leave empty and the project gets a designed cover with its name." value={editing.values.heroImageUrl} onChange={(heroImageUrl) => set({ heroImageUrl })} accept="image/*" category="projects" accessPolicy="Inherit" preview error={errorOf(fieldErrors, "heroImageUrl")} />
            <ChipsField label="Tags" values={editing.values.tags} max={20} onChange={(tags) => set({ tags })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Live site address" placeholder="https://…" value={editing.values.liveUrl} onChange={(liveUrl) => set({ liveUrl })} error={errorOf(fieldErrors, "liveUrl")} />
              <TextField label="Repository address" placeholder="https://github.com/…" value={editing.values.githubUrl} onChange={(githubUrl) => set({ githubUrl })} error={errorOf(fieldErrors, "githubUrl")} />
            </div>
            <TextAreaField label="Details page text" hint="Markdown, shown on the project's own page. Start with a bold line such as **Ongoing, 2025** to show it as a badge on the home page." rows={8} value={editing.values.contentMarkdown} onChange={(contentMarkdown) => set({ contentMarkdown })} error={errorOf(fieldErrors, "contentMarkdown")} />
            <ToggleField label="Published" description="Off keeps it as a draft that only admins see." checked={editing.values.isPublished} onChange={(isPublished) => set({ isPublished })} />
            <ToggleField label="Private repository" description="Visitors ask for access instead of getting the repository link." checked={editing.values.isRepoPrivate} onChange={(isRepoPrivate) => set({ isRepoPrivate })} />
            <ToggleField label="Featured" checked={editing.values.isFeatured} onChange={(isFeatured) => set({ isFeatured })} />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this project?"
        message={<>{toDelete?.title} and its page will be removed. This cannot be undone. To keep it but not show it, set it to draft instead.</>}
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Panel>
  );
}

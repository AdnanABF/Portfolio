"use client";

import { useState } from "react";
import { Check, Loader2, UploadCloud, X } from "lucide-react";
import { getPresignedUpload, updateExperience, updateProject, updateSetting } from "@/lib/api-client";

interface FormDataState {
  id?: string;
  slug?: string;
  title?: string;
  tagline?: string;
  description?: string;
  heroImageUrl?: string;
  liveUrl?: string;
  githubUrl?: string;
  role?: string;
  company?: string;
  period?: string;
  location?: string;
  achievements?: string[];
  achievementsText?: string;
  key?: string;
  value?: string;
  [key: string]: unknown;
}

interface EditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  type: "project" | "experience" | "setting";
  initialData: Record<string, unknown>;
  onSaved: (updatedData: Record<string, unknown>) => void;
}

export function InContextEditDrawer({
  isOpen,
  onClose,
  type,
  initialData,
  onSaved,
}: EditDrawerProps) {
  const [formData, setFormData] = useState<FormDataState>({
    ...initialData,
    achievementsText: Array.isArray(initialData?.achievements)
      ? (initialData.achievements as string[]).join("\n")
      : "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, folder: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const presign = await getPresignedUpload(file.name, file.type, folder);

      // Direct upload to Cloudflare R2
      const res = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!res.ok) throw new Error("Cloudflare R2 upload rejected.");

      setFormData((prev) => ({ ...prev, [fieldName]: presign.publicUrl }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload file to Cloudflare R2.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (type === "project" && formData.id) {
        await updateProject(formData.id, formData as Record<string, unknown>);
      } else if (type === "experience" && formData.id) {
        const payload: Record<string, unknown> = {
          ...formData,
          achievements: (formData.achievementsText || "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        };
        await updateExperience(formData.id, payload);
      } else if (type === "setting" && formData.key && formData.value) {
        await updateSetting(formData.key, formData.value);
      }

      onSaved(formData as Record<string, unknown>);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg h-full border-l-3 border-line bg-surface p-6 shadow-[-6px_0px_0px_var(--shadow-color)] flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-line pb-4">
            <div>
              <span className="font-mono text-xs text-primary font-bold">IN-CONTEXT EDITOR</span>
              <h3 className="text-xl font-bold text-foreground">
                Edit {type.charAt(0).toUpperCase() + type.slice(1)}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted hover:bg-cream hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border-2 border-accent-coral bg-accent-coral/10 p-3 font-mono text-xs text-accent-coral">
              {error}
            </div>
          )}

          {/* Dynamic Fields */}
          <form id="edit-form" onSubmit={handleSave} className="mt-6 space-y-4 font-mono text-xs">
            {type === "project" && (
              <>
                <div>
                  <label className="font-bold text-foreground block mb-1">Project Title</label>
                  <input
                    type="text"
                    value={formData.title || ""}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-lg border-2 border-line bg-surface-2 p-2.5 font-sans text-sm text-foreground focus:outline-primary"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Tagline</label>
                  <input
                    type="text"
                    value={formData.tagline || ""}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="w-full rounded-lg border-2 border-line bg-surface-2 p-2.5 font-sans text-sm text-foreground focus:outline-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Description</label>
                  <textarea
                    rows={4}
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-lg border-2 border-line bg-surface-2 p-2.5 font-sans text-sm text-foreground focus:outline-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Hero Image</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.heroImageUrl || ""}
                      onChange={(e) => setFormData({ ...formData, heroImageUrl: e.target.value })}
                      className="w-full rounded-lg border-2 border-line bg-surface-2 p-2 text-xs text-foreground focus:outline-primary"
                    />
                    <label className="flex items-center gap-1 rounded-lg border-2 border-line bg-primary px-3 py-1 font-bold text-white hover:bg-primary-strong cursor-pointer shrink-0">
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "heroImageUrl", "projects")}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-foreground block mb-1">Live URL</label>
                    <input
                      type="text"
                      value={formData.liveUrl || ""}
                      onChange={(e) => setFormData({ ...formData, liveUrl: e.target.value })}
                      className="w-full rounded-lg border-2 border-line bg-surface-2 p-2 text-xs text-foreground focus:outline-primary"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-foreground block mb-1">GitHub URL</label>
                    <input
                      type="text"
                      value={formData.githubUrl || ""}
                      onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                      className="w-full rounded-lg border-2 border-line bg-surface-2 p-2 text-xs text-foreground focus:outline-primary"
                    />
                  </div>
                </div>
              </>
            )}

            {type === "experience" && (
              <>
                <div>
                  <label className="font-bold text-foreground block mb-1">Role / Job Title</label>
                  <input
                    type="text"
                    value={formData.role || ""}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full rounded-lg border-2 border-line bg-surface-2 p-2.5 font-sans text-sm text-foreground focus:outline-primary"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-foreground block mb-1">Company</label>
                    <input
                      type="text"
                      value={formData.company || ""}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full rounded-lg border-2 border-line bg-surface-2 p-2 text-xs text-foreground focus:outline-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-foreground block mb-1">Period</label>
                    <input
                      type="text"
                      value={formData.period || ""}
                      onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                      className="w-full rounded-lg border-2 border-line bg-surface-2 p-2 text-xs text-foreground focus:outline-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location || ""}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full rounded-lg border-2 border-line bg-surface-2 p-2 text-xs text-foreground focus:outline-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">
                    Key Achievements (one per line)
                  </label>
                  <textarea
                    rows={6}
                    value={formData.achievementsText || ""}
                    onChange={(e) => setFormData({ ...formData, achievementsText: e.target.value })}
                    className="w-full rounded-lg border-2 border-line bg-surface-2 p-2.5 font-sans text-xs text-foreground focus:outline-primary"
                  />
                </div>
              </>
            )}

            {type === "setting" && (
              <div>
                <label className="font-bold text-foreground block mb-1">
                  Setting Value ({formData.key})
                </label>
                <textarea
                  rows={6}
                  value={formData.value || ""}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full rounded-lg border-2 border-line bg-surface-2 p-2.5 font-sans text-sm text-foreground focus:outline-primary"
                  required
                />
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 border-t-2 border-line pt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-line bg-surface-2 px-4 py-2 font-mono text-xs font-bold text-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-form"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl border-2 border-line bg-accent-mint px-5 py-2 font-mono text-xs font-bold text-neutral-950 shadow-[3px_3px_0px_var(--shadow-color)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            <span>Save to Database</span>
          </button>
        </div>
      </div>
    </div>
  );
}

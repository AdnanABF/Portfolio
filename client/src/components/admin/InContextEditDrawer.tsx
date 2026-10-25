"use client";

import { useEffect, useState } from "react";
import { Check, FileText, ImageIcon, Loader2, UploadCloud, X } from "lucide-react";
import Image from "next/image";
import {
  createSkill,
  getPresignedUpload,
  updateExperience,
  updateProject,
  updateSetting,
  updateSkill,
} from "@/lib/api-client";

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
  // Skills
  name?: string;
  category?: string;
  level?: number;
  iconName?: string;
  // Settings & Hero
  key?: string;
  value?: string;
  photoUrl?: string;
  cvUrl?: string;
  [key: string]: unknown;
}

interface EditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  type: "project" | "experience" | "setting" | "skill";
  initialData: Record<string, unknown>;
  onSaved: (updatedData: Record<string, unknown>) => void;
}

function parseInitialFormData(initialData: Record<string, unknown>): FormDataState {
  let achievementsText = "";
  if (Array.isArray(initialData?.description)) {
    achievementsText = (initialData.description as string[]).join("\n");
  } else if (Array.isArray(initialData?.achievements)) {
    achievementsText = (initialData.achievements as string[]).join("\n");
  } else if (typeof initialData?.achievementsText === "string") {
    achievementsText = initialData.achievementsText;
  }

  let photoUrl = (initialData?.photoUrl as string) || "/adnan_photo.webp";
  let cvUrl = (initialData?.cvUrl as string) || "/Adnan_CV.pdf";

  if (initialData?.key === "hero_photo_cv" && typeof initialData?.value === "string") {
    try {
      const parsed = JSON.parse(initialData.value);
      if (parsed.photoUrl) photoUrl = parsed.photoUrl;
      if (parsed.cvUrl) cvUrl = parsed.cvUrl;
    } catch {
      // ignore
    }
  }

  return {
    ...initialData,
    achievementsText,
    photoUrl,
    cvUrl,
    name: (initialData?.name as string) || "",
    category: (initialData?.category as string) || "Modern",
    level: typeof initialData?.level === "number" ? initialData.level : 80,
  };
}

export function InContextEditDrawer({
  isOpen,
  onClose,
  type,
  initialData,
  onSaved,
}: EditDrawerProps) {
  const [formData, setFormData] = useState<FormDataState>(() => parseInitialFormData(initialData));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(parseInitialFormData(initialData));
  }, [initialData]);

  if (!isOpen) return null;

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: string,
    folder: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadingField(fieldName);
    setError(null);
    try {
      const presign = await getPresignedUpload(file.name, file.type, folder);

      // Direct upload to Cloudflare R2 / S3
      const res = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!res.ok) throw new Error("File upload was rejected by storage provider.");

      setFormData((prev) => ({ ...prev, [fieldName]: presign.publicUrl }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload file.");
    } finally {
      setIsUploading(false);
      setUploadingField(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      let savedData: Record<string, unknown> = { ...formData };

      if (type === "project" && formData.id) {
        await updateProject(formData.id, formData as Record<string, unknown>);
      } else if (type === "experience" && formData.id) {
        const payload: Record<string, unknown> = {
          ...formData,
          achievements: (formData.achievementsText || "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          description: (formData.achievementsText || "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        };
        await updateExperience(formData.id, payload);
        savedData = payload;
      } else if (type === "skill") {
        const skillPayload = {
          name: formData.name || "",
          category: formData.category || "Modern",
          sortOrder: typeof formData.sortOrder === "number" ? formData.sortOrder : 0,
          iconName: formData.iconName || "",
        };
        if (formData.id) {
          const updated = await updateSkill(formData.id, skillPayload);
          savedData = { ...updated, level: formData.level ?? 80 };
        } else {
          const created = await createSkill(skillPayload);
          savedData = { ...created, level: formData.level ?? 80 };
        }
      } else if (type === "setting") {
        if (formData.key === "hero_photo_cv") {
          const payloadValue = JSON.stringify(
            { photoUrl: formData.photoUrl, cvUrl: formData.cvUrl },
            null,
            2
          );
          await updateSetting("hero_photo_cv", payloadValue);
          savedData = {
            ...formData,
            value: payloadValue,
          };
        } else if (formData.key && formData.value) {
          await updateSetting(formData.key, formData.value);
        }
      }

      onSaved(savedData);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const isHeroMediaSetting = type === "setting" && formData.key === "hero_photo_cv";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg h-full border-l-3 border-line bg-surface p-6 shadow-[-6px_0px_0px_var(--shadow-color)] flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-line pb-4">
            <div>
              <span className="font-mono text-xs text-primary font-bold">IN-CONTEXT EDITOR</span>
              <h3 className="text-xl font-bold text-foreground">
                {isHeroMediaSetting
                  ? "Edit Hero Photo & CV"
                  : `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted hover:bg-cream hover:text-foreground cursor-pointer"
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
            {/* Project */}
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
                      {isUploading && uploadingField === "heroImageUrl" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UploadCloud className="h-4 w-4" />
                      )}
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

            {/* Experience */}
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
                    Key Achievements / Responsibilities (one per line)
                  </label>
                  <textarea
                    rows={6}
                    value={formData.achievementsText || ""}
                    onChange={(e) => setFormData({ ...formData, achievementsText: e.target.value })}
                    className="w-full rounded-lg border-2 border-line bg-surface-2 p-2.5 font-sans text-xs text-foreground focus:outline-primary"
                    placeholder="Enter one achievement per line..."
                  />
                </div>
              </>
            )}

            {/* Skill */}
            {type === "skill" && (
              <>
                <div>
                  <label className="font-bold text-foreground block mb-1">Skill Name</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border-2 border-line bg-surface-2 p-2.5 font-sans text-sm text-foreground focus:outline-primary"
                    placeholder="e.g. Next.js, C#, Docker"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Category</label>
                  <select
                    value={formData.category || "Modern"}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-lg border-2 border-line bg-surface-2 p-2.5 font-sans text-sm text-foreground focus:outline-primary cursor-pointer"
                  >
                    <option value="Modern">Modern (React, Next.js, Node...)</option>
                    <option value="Microsoft">Microsoft (.NET, C#, Azure, MSSQL...)</option>
                    <option value="Tools">Tools (Docker, Git, Coolify, CI/CD...)</option>
                    <option value="Legacy">Legacy (Knockout.js, AngularJS, WCF...)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-foreground">Proficiency Level</label>
                    <span className="font-mono text-xs font-bold text-primary">{formData.level ?? 80}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={formData.level ?? 80}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value, 10) })}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>
              </>
            )}

            {/* Hero & Media Dedicated UI */}
            {isHeroMediaSetting && (
              <div className="space-y-5">
                {/* Profile Photo */}
                <div className="rounded-xl border-2 border-line bg-surface-2 p-3 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <span>Profile Photo</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-line bg-surface">
                      <Image
                        src={formData.photoUrl || "/adnan_photo.webp"}
                        alt="Profile photo preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={formData.photoUrl || ""}
                        onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                        className="w-full rounded-lg border-2 border-line bg-surface p-1.5 text-xs text-foreground focus:outline-primary font-mono"
                        placeholder="/adnan_photo.webp or https://..."
                      />
                      <label className="mt-2 inline-flex items-center gap-1.5 rounded-lg border-2 border-line bg-primary px-3 py-1 font-bold text-white hover:bg-primary-strong cursor-pointer text-xs">
                        {isUploading && uploadingField === "photoUrl" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UploadCloud className="h-3.5 w-3.5" />
                        )}
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "photoUrl", "photos")}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* CV PDF Document */}
                <div className="rounded-xl border-2 border-line bg-surface-2 p-3 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <FileText className="h-4 w-4 text-accent-coral" />
                    <span>Resume / CV Document (PDF)</span>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={formData.cvUrl || ""}
                      onChange={(e) => setFormData({ ...formData, cvUrl: e.target.value })}
                      className="w-full rounded-lg border-2 border-line bg-surface p-1.5 text-xs text-foreground focus:outline-primary font-mono"
                      placeholder="/Adnan_CV.pdf or https://..."
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <label className="inline-flex items-center gap-1.5 rounded-lg border-2 border-line bg-accent-coral px-3 py-1 font-bold text-white hover:opacity-90 cursor-pointer text-xs">
                        {isUploading && uploadingField === "cvUrl" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UploadCloud className="h-3.5 w-3.5" />
                        )}
                        <span>Upload PDF</span>
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "cvUrl", "documents")}
                        />
                      </label>
                      {formData.cvUrl && (
                        <a
                          href={formData.cvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline font-mono"
                        >
                          View Current PDF ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* General Setting Fallback */}
            {type === "setting" && !isHeroMediaSetting && (
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
            className="rounded-xl border-2 border-line bg-surface-2 px-4 py-2 font-mono text-xs font-bold text-muted hover:text-foreground cursor-pointer"
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
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}

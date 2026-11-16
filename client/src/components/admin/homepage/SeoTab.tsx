"use client";

import { Panel, TextAreaField, TextField, errorOf, type FieldErrors } from "./fields";
import type { HomepageContent } from "@/lib/homepage";

interface TabProps {
  content: HomepageContent;
  onChange: (next: HomepageContent) => void;
  errors: FieldErrors;
}

/** The title and description search engines and link previews show for the home page. */
export function SeoTab({ content, onChange, errors }: TabProps) {
  const { seo } = content;
  const set = (patch: Partial<typeof seo>) => onChange({ ...content, seo: { ...seo, ...patch } });

  return (
    <Panel title="Search appearance" description="Shown in the browser tab, in search results and when the site is shared. Search engines may take a while to pick up a change.">
      <TextField label="Page title" value={seo.title} maxLength={120} onChange={(title) => set({ title })} error={errorOf(errors, "seo.title")} hint="Around 60 characters reads best in search results." />
      <TextAreaField label="Description" rows={3} maxLength={300} value={seo.description} onChange={(description) => set({ description })} error={errorOf(errors, "seo.description")} hint="One or two sentences, around 150 characters." />
      <div className="rounded-xl border-2 border-line bg-surface-2/50 p-4">
        <p className="font-mono text-[10px] font-bold text-muted">PREVIEW</p>
        <p className="mt-1 truncate text-base font-bold text-primary">{seo.title || "Page title"}</p>
        <p className="mt-0.5 font-mono text-[11px] text-green-700 dark:text-green-400">adnanbinfarook.com</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted">{seo.description || "Description"}</p>
      </div>
    </Panel>
  );
}

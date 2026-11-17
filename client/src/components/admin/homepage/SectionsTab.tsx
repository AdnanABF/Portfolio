"use client";

import { Panel, RowControls, TextAreaField, TextField, ToggleField, errorOf, moveItem, type FieldErrors } from "./fields";
import type { HomepageContent, SectionItem } from "@/lib/homepage";

interface TabProps {
  content: HomepageContent;
  onChange: (next: HomepageContent) => void;
  errors: FieldErrors;
}

const SECTION_NAMES: Record<string, string> = {
  about: "About",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
  contact: "Contact",
};

/**
 * The sections below the hero: their order, whether they show, the name in the navigation bar, and their heading.
 * The navigation bar uses exactly this list, so a section switched off disappears from both.
 */
export function SectionsTab({ content, onChange, errors }: TabProps) {
  const sections = content.sections;
  const set = (next: SectionItem[]) => onChange({ ...content, sections: next });
  const update = (index: number, patch: Partial<SectionItem>) => set(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-5">
      <Panel title="Sections and navigation" description="Reorder the sections, switch one off, and set its name in the navigation bar and its heading. A section with no items stays hidden on its own.">
        {sections.map((section, index) => (
          <div key={section.id} className="space-y-3 rounded-xl border-2 border-line bg-surface-2/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs font-extrabold text-foreground">
                {index + 1}. {SECTION_NAMES[section.id] ?? section.id}
                {!section.enabled ? <span className="ml-2 font-bold text-muted">(hidden)</span> : null}
              </span>
              <RowControls index={index} count={sections.length} label={SECTION_NAMES[section.id] ?? section.id} onMove={(from, to) => set(moveItem(sections, from, to))} />
            </div>
            <ToggleField label="Show this section" description="Off hides it from the page and from the navigation bar." checked={section.enabled} onChange={(enabled) => update(index, { enabled })} />
            <TextField label="Name in the navigation bar" value={section.label} maxLength={30} onChange={(label) => update(index, { label })} error={errorOf(errors, `sections[${index}].label`)} />
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField label="Small line above" value={section.eyebrow} maxLength={40} onChange={(eyebrow) => update(index, { eyebrow })} error={errorOf(errors, `sections[${index}].eyebrow`)} />
              <TextField label="Title" value={section.title} maxLength={60} onChange={(title) => update(index, { title })} error={errorOf(errors, `sections[${index}].title`)} />
              <TextField label="Title highlight" hint="Accent colour." value={section.titleHighlight} maxLength={60} onChange={(titleHighlight) => update(index, { titleHighlight })} error={errorOf(errors, `sections[${index}].titleHighlight`)} />
            </div>
            <TextAreaField label="Description under the title" rows={2} maxLength={300} value={section.description} onChange={(description) => update(index, { description })} error={errorOf(errors, `sections[${index}].description`)} />
          </div>
        ))}
      </Panel>

      <Panel title="Contact section text" description="The paragraph next to the contact form. The email card comes from your Email link, and the location card from the address.">
        <TextAreaField label="Text" rows={4} maxLength={600} value={content.contact.text} onChange={(text) => onChange({ ...content, contact: { ...content.contact, text } })} error={errorOf(errors, "contact.text")} />
      </Panel>
    </div>
  );
}

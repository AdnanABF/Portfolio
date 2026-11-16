"use client";

import { Plus } from "lucide-react";
import { Panel, RowControls, SelectField, TextField, ToggleField, errorOf, moveItem, type FieldErrors } from "./fields";
import { LIMITS, LINK_KINDS, newId, type HomepageContent, type LinkItem, type LinkKind } from "@/lib/homepage";

interface TabProps {
  content: HomepageContent;
  onChange: (next: HomepageContent) => void;
  errors: FieldErrors;
}

const KIND_OPTIONS = LINK_KINDS.map((kind) => ({
  value: kind,
  label: { github: "GitHub", linkedin: "LinkedIn", email: "Email", website: "Website", phone: "Phone", other: "Other" }[kind],
}));

const URL_HINT: Record<LinkKind, string> = {
  github: "https://github.com/your-name",
  linkedin: "https://www.linkedin.com/in/your-name",
  email: "mailto:you@example.com",
  website: "https://example.com",
  phone: "tel:+1234567890",
  other: "https://…",
};

/** The social and contact links: add, remove and reorder. The first Email link is also shown in the Contact section. */
export function LinksTab({ content, onChange, errors }: TabProps) {
  const links = content.links;
  const set = (next: LinkItem[]) => onChange({ ...content, links: next });
  const update = (index: number, patch: Partial<LinkItem>) => set(links.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-5">
      <Panel
        title="Links"
        description="Icons in the hero card and addresses on the resume page. Use https:// for websites, mailto: for email and tel: for phone numbers."
        action={
          <button
            type="button"
            disabled={links.length >= LIMITS.links}
            onClick={() => set([...links, { id: newId(), label: "", url: "", kind: "website", showInHero: true }])}
            className="neo-button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" /> Add link
          </button>
        }
      >
        {links.length === 0 ? <p className="font-mono text-xs text-muted">No links yet.</p> : null}
        {links.map((link, index) => (
          <div key={link.id} className="space-y-3 rounded-xl border-2 border-line bg-surface-2/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs font-bold text-muted">Link {index + 1}</span>
              <RowControls
                index={index}
                count={links.length}
                label={link.label || `link ${index + 1}`}
                onMove={(from, to) => set(moveItem(links, from, to))}
                onDelete={() => set(links.filter((_, i) => i !== index))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label="Type" value={link.kind} options={KIND_OPTIONS} onChange={(kind) => update(index, { kind: kind as LinkKind })} error={errorOf(errors, `links[${index}].kind`)} />
              <TextField label="Label" value={link.label} maxLength={40} onChange={(label) => update(index, { label })} error={errorOf(errors, `links[${index}].label`)} />
            </div>
            <TextField label="Address" value={link.url} maxLength={500} placeholder={URL_HINT[link.kind]} onChange={(url) => update(index, { url })} error={errorOf(errors, `links[${index}].url`)} />
            <ToggleField label="Show as an icon in the hero" checked={link.showInHero} onChange={(showInHero) => update(index, { showInHero })} />
          </div>
        ))}
      </Panel>
    </div>
  );
}

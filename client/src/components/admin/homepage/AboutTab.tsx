"use client";

import { Plus } from "lucide-react";
import { ABOUT_COLOR_CLASSES, ABOUT_ICON_COMPONENTS } from "@/components/sections/aboutVisuals";
import { Panel, RowControls, SelectField, TextAreaField, TextField, errorOf, moveItem, type FieldErrors } from "./fields";
import {
  ABOUT_COLORS, ABOUT_ICONS, LIMITS, newId,
  type AboutCard, type AboutColor, type AboutIcon, type AboutSize, type HomepageContent,
} from "@/lib/homepage";

interface TabProps {
  content: HomepageContent;
  onChange: (next: HomepageContent) => void;
  errors: FieldErrors;
}

const ICON_OPTIONS = ABOUT_ICONS.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }));
const COLOR_OPTIONS = ABOUT_COLORS.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }));
const SIZE_OPTIONS: Array<{ value: AboutSize; label: string }> = [
  { value: "large", label: "Large (half the row)" },
  { value: "small", label: "Small (a third of the row)" },
];

/** The About cards: any number, any order. Each has a title, a text, an icon, a colour and a size. */
export function AboutTab({ content, onChange, errors }: TabProps) {
  const cards = content.about.cards;
  const set = (next: AboutCard[]) => onChange({ ...content, about: { ...content.about, cards: next } });
  const update = (index: number, patch: Partial<AboutCard>) => set(cards.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-5">
      <Panel
        title="About cards"
        description="My journey, philosophy, tools, interests, goals: whatever you want to say about yourself. The section heading is under Sections."
        action={
          <button
            type="button"
            disabled={cards.length >= LIMITS.aboutCards}
            onClick={() => set([...cards, { id: newId(), title: "", text: "", icon: "sparkles", color: "primary", size: "small" }])}
            className="neo-button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" /> Add card
          </button>
        }
      >
        {cards.length === 0 ? <p className="font-mono text-xs text-muted">No cards yet. The About section is hidden until there is at least one.</p> : null}
        {cards.map((card, index) => {
          const Icon = ABOUT_ICON_COMPONENTS[card.icon] ?? ABOUT_ICON_COMPONENTS.user;
          return (
            <div key={card.id} className="space-y-3 rounded-xl border-2 border-line bg-surface-2/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`rounded-lg p-1.5 ${ABOUT_COLOR_CLASSES[card.color] ?? ""}`}>
                    <Icon size={16} />
                  </span>
                  <span className="truncate font-mono text-xs font-bold text-foreground">{card.title || `Card ${index + 1}`}</span>
                </div>
                <RowControls
                  index={index}
                  count={cards.length}
                  label={card.title || `card ${index + 1}`}
                  onMove={(from, to) => set(moveItem(cards, from, to))}
                  onDelete={() => set(cards.filter((_, i) => i !== index))}
                />
              </div>
              <TextField label="Title" value={card.title} maxLength={60} onChange={(title) => update(index, { title })} error={errorOf(errors, `about.cards[${index}].title`)} />
              <TextAreaField label="Text" rows={5} maxLength={1200} value={card.text} onChange={(text) => update(index, { text })} error={errorOf(errors, `about.cards[${index}].text`)} />
              <div className="grid gap-3 sm:grid-cols-3">
                <SelectField label="Icon" value={card.icon} options={ICON_OPTIONS} onChange={(icon) => update(index, { icon: icon as AboutIcon })} />
                <SelectField label="Colour" value={card.color} options={COLOR_OPTIONS} onChange={(color) => update(index, { color: color as AboutColor })} />
                <SelectField label="Size" value={card.size} options={SIZE_OPTIONS} onChange={(size) => update(index, { size: size as AboutSize })} />
              </div>
            </div>
          );
        })}
      </Panel>
    </div>
  );
}

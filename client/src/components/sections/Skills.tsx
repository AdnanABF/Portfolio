"use client";

import { useMemo, useState } from "react";
import { Reveal } from "@/components/effects/Reveal";
import { Badge } from "@/components/ui/Badge";
import { useSiteContent, useSiteLists } from "@/components/site/SiteContentProvider";
import { sectionOf } from "@/lib/homepage";
import type { Skill } from "@/lib/types";
import { SectionHead } from "./SectionHead";

const BADGE_COLORS: Array<"yellow" | "mint" | "violet" | "coral" | "sky"> = ["sky", "mint", "yellow", "coral", "violet"];

/** The first categories (in the order set in the admin hub) are drawn as the layers of the stack; the rest go in the side panel. */
const STACK_LAYERS = 6;

type Group = { category: string; skills: Skill[]; index: number };

/**
 * Skills drawn as a map of a system: each category is a layer, joined to the next by a line with a small signal
 * travelling down it, and the remaining categories sit in a side panel. The pills above highlight one category and
 * dim the rest. Everything is visible at once, with no percentages. On phones the layers stack and the side panel
 * moves below. The animation is off for visitors who prefer reduced motion.
 */
export function Skills() {
  const content = useSiteContent();
  const items = useSiteLists().skills;
  const [active, setActive] = useState<string | null>(null);

  // Categories appear in the order their first skill appears.
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Skill[]>();
    for (const skill of items) {
      const list = map.get(skill.category) ?? [];
      list.push(skill);
      map.set(skill.category, list);
    }
    return Array.from(map.entries()).map(([category, skills], index) => ({ category, skills, index }));
  }, [items]);

  if (items.length === 0) return null;

  const stack = groups.slice(0, STACK_LAYERS);
  const side = groups.slice(STACK_LAYERS);
  const toggle = (category: string) => setActive((cur) => (cur === category ? null : category));
  const dimmed = (category: string) => active !== null && active !== category;

  return (
    <section id="skills" className="scroll-mt-24 bg-cream/50 px-6 py-20 md:px-12">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHead section={sectionOf(content, "skills")} />
        </Reveal>

        {/* Category pills: pick one to light it up, pick it again (or "All") to clear */}
        <Reveal>
          <div className="mb-8 flex flex-wrap justify-center gap-2" role="group" aria-label="Highlight a skill category">
            <PillButton pressed={active === null} onClick={() => setActive(null)}>
              All <span className="opacity-70">{items.length}</span>
            </PillButton>
            {groups.map((g) => (
              <PillButton key={g.category} pressed={active === g.category} onClick={() => toggle(g.category)}>
                {g.category} <span className="opacity-70">{g.skills.length}</span>
              </PillButton>
            ))}
          </div>
        </Reveal>

        <Reveal>
          <div className={`grid gap-6 ${side.length > 0 ? "lg:grid-cols-[minmax(0,1fr)_17rem]" : ""}`}>
            {/* The stack */}
            <div>
              {stack.map((g, i) => (
                <div key={g.category}>
                  <Layer group={g} dimmed={dimmed(g.category)} highlighted={active === g.category} onSelect={() => toggle(g.category)} />
                  {i < stack.length - 1 ? <Connector /> : null}
                </div>
              ))}
            </div>

            {/* The side panel */}
            {side.length > 0 ? (
              <aside className="h-fit space-y-5 rounded-2xl border-2 border-dashed border-line bg-surface/60 p-5" aria-label="Supporting skills">
                {side.map((g) => (
                  <div
                    key={g.category}
                    className={`transition-opacity duration-300 ${dimmed(g.category) ? "opacity-30" : "opacity-100"}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(g.category)}
                      aria-pressed={active === g.category}
                      className="mb-2 flex w-full cursor-pointer items-center gap-2 text-left font-mono text-xs font-bold text-muted transition-colors hover:text-primary"
                    >
                      <span className={`h-2 w-2 rounded-full ${active === g.category ? "bg-primary" : "bg-line"}`} aria-hidden="true" />
                      {g.category}
                    </button>
                    <ul className="flex flex-wrap gap-1.5">
                      {g.skills.map((skill) => (
                        <Chip key={skill.id ?? skill.name} color={BADGE_COLORS[g.index % BADGE_COLORS.length]}>
                          {skill.name}
                        </Chip>
                      ))}
                    </ul>
                  </div>
                ))}
              </aside>
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PillButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-line px-3 py-1 font-mono text-[11px] font-bold transition-all hover:-translate-y-px sm:text-xs ${
        pressed
          ? "bg-primary text-white shadow-[2px_2px_0px_var(--shadow-color)] dark:text-black"
          : "bg-surface text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Chip({ color, children }: { color: "yellow" | "mint" | "violet" | "coral" | "sky"; children: React.ReactNode }) {
  return (
    <li className="transition-transform duration-200 hover:-translate-y-0.5">
      <Badge color={color}>{children}</Badge>
    </li>
  );
}

function Layer({ group, dimmed, highlighted, onSelect }: { group: Group; dimmed: boolean; highlighted: boolean; onSelect: () => void }) {
  const color = BADGE_COLORS[group.index % BADGE_COLORS.length];
  return (
    <div
      className={`grid gap-3 rounded-2xl border-2 bg-surface p-4 transition-all duration-300 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-center sm:gap-5 sm:p-5 ${
        highlighted
          ? "border-primary shadow-[5px_5px_0px_var(--shadow-color)]"
          : "border-line shadow-[3px_3px_0px_var(--shadow-color)]"
      } ${dimmed ? "opacity-30" : "opacity-100"}`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={highlighted}
        className="flex cursor-pointer items-center gap-3 text-left"
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-line font-mono text-xs font-black ${
            highlighted ? "bg-primary text-white dark:text-black" : "bg-surface-2 text-primary"
          }`}
        >
          {String(group.index + 1).padStart(2, "0")}
        </span>
        <span className="font-mono text-sm leading-tight font-bold text-foreground">{group.category}</span>
      </button>
      <ul className="flex flex-wrap gap-2">
        {group.skills.map((skill) => (
          <Chip key={skill.id ?? skill.name} color={color}>
            {skill.name}
          </Chip>
        ))}
      </ul>
    </div>
  );
}

/** The line between two layers, with a small signal dot travelling down it. */
function Connector() {
  return (
    <div className="relative mx-auto h-6 w-0 border-l-2 border-dashed border-line" aria-hidden="true">
      <span className="skills-signal absolute -left-[5px] h-2 w-2 rounded-full bg-primary" />
    </div>
  );
}

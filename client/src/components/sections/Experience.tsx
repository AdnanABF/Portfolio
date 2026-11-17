"use client";

import { useState } from "react";
import { Briefcase, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { Reveal } from "@/components/effects/Reveal";
import { useSiteContent, useSiteLists } from "@/components/site/SiteContentProvider";
import { sectionOf } from "@/lib/homepage";
import { SectionHead } from "./SectionHead";
import { TimelineEntry, TimelineList } from "./TimelineEntry";

/**
 * Work experience as a single timeline. Each entry shows the role, company, place and period; the achievements open
 * on demand. The most recent role starts open, and "Expand all / Collapse all" opens or closes everything.
 */
export function Experience() {
  const content = useSiteContent();
  const items = useSiteLists().experience;
  const [open, setOpen] = useState<Set<string>>(() => new Set(items.slice(0, 1).map((i) => i.id)));

  if (items.length === 0) return null;

  const withDetails = items.filter((i) => i.description.length > 0);
  const allOpen = withDetails.length > 0 && withDetails.every((i) => open.has(i.id));
  const toggle = (id: string) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section id="experience" className="scroll-mt-24 px-6 py-20 md:px-12">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <SectionHead section={sectionOf(content, "experience")} />
        </Reveal>

        {withDetails.length > 1 ? (
          <div className="-mt-6 mb-6 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(allOpen ? new Set() : new Set(withDetails.map((i) => i.id)))}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-line bg-surface px-3 py-1.5 font-mono text-xs font-bold text-foreground shadow-[2px_2px_0px_var(--shadow-color)] transition-all hover:-translate-y-px"
            >
              {allOpen ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          </div>
        ) : null}

        <TimelineList>
          {items.map((exp, index) => (
            <TimelineEntry
              key={exp.id}
              title={exp.role}
              organisation={exp.company}
              icon={<Briefcase size={14} />}
              location={exp.location}
              period={exp.period}
              details={exp.description}
              open={open.has(exp.id)}
              onToggle={() => toggle(exp.id)}
              delay={index * 80}
            />
          ))}
        </TimelineList>
      </div>
    </section>
  );
}

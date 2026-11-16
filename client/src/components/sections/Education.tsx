"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Reveal } from "@/components/effects/Reveal";
import { useSiteContent, useSiteLists } from "@/components/site/SiteContentProvider";
import { sectionOf } from "@/lib/homepage";
import { SectionHead } from "./SectionHead";
import { TimelineEntry, TimelineList } from "./TimelineEntry";

/** Education as a timeline, like experience: the summary is always visible and any details open on demand. */
export function Education() {
  const content = useSiteContent();
  const items = useSiteLists().education;
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  if (items.length === 0) return null;

  const toggle = (id: string) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section id="education" className="scroll-mt-24 bg-cream/50 px-6 py-20 md:px-12">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <SectionHead section={sectionOf(content, "education")} />
        </Reveal>

        <TimelineList>
          {items.map((entry, index) => (
            <TimelineEntry
              key={entry.id}
              title={entry.qualification}
              organisation={entry.institution}
              icon={<GraduationCap size={14} />}
              location={entry.location}
              period={entry.period}
              details={entry.details}
              detailsLabel="detail"
              open={open.has(entry.id)}
              onToggle={() => toggle(entry.id)}
              delay={index * 80}
            />
          ))}
        </TimelineList>
      </div>
    </section>
  );
}

"use client";

import { Reveal } from "@/components/effects/Reveal";
import { useSiteContent, useSiteLists } from "@/components/site/SiteContentProvider";
import { sectionOf } from "@/lib/homepage";
import { ProjectShowcase } from "./ProjectShowcase";
import { SectionHead } from "./SectionHead";

export function Projects() {
  const content = useSiteContent();
  const projects = useSiteLists().projects;

  if (projects.length === 0) return null;

  return (
    <section id="projects" className="scroll-mt-24 px-6 py-20 md:px-12">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHead section={sectionOf(content, "projects")} />
        </Reveal>

        <div className="space-y-16 md:space-y-24">
          {projects.map((project, index) => (
            <ProjectShowcase key={project.id} project={project} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

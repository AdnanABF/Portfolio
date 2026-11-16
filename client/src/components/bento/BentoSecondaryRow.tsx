"use client";

import { Reveal } from "@/components/effects/Reveal";
import { StackCell } from "@/components/bento/StackCell";
import { FeaturedCell } from "@/components/bento/FeaturedCell";
import { useSiteContent, useSiteLists } from "@/components/site/SiteContentProvider";

export function BentoSecondaryRow() {
  const { coreStack } = useSiteContent();
  const { projects } = useSiteLists();
  const featuredProject = projects.find((p) => p.isPrivate === false) || projects[0] || null;

  const hasStack = coreStack.length > 0;
  const hasProject = !!featuredProject;
  if (!hasStack && !hasProject) return null;

  return (
    <>
      {hasStack && (
        <Reveal className={hasProject ? "md:col-span-7" : "md:col-span-12"} delay={200}>
          <StackCell />
        </Reveal>
      )}
      {hasProject && (
        <Reveal className={hasStack ? "md:col-span-5" : "md:col-span-12"} delay={250}>
          <FeaturedCell initialProject={featuredProject} />
        </Reveal>
      )}
    </>
  );
}

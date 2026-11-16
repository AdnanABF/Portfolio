"use client";

import type { ComponentType } from "react";
import { HeroSection } from "@/components/bento/HeroSection";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { Certifications } from "@/components/sections/Certifications";
import { Education } from "@/components/sections/Education";
import { Experience } from "@/components/sections/Experience";
import { Projects } from "@/components/sections/Projects";
import { Skills } from "@/components/sections/Skills";
import { useSiteContent } from "@/components/site/SiteContentProvider";
import type { SectionId } from "@/lib/homepage";

const SECTION_COMPONENTS: Record<SectionId, ComponentType> = {
  about: About,
  experience: Experience,
  education: Education,
  skills: Skills,
  projects: Projects,
  certifications: Certifications,
  contact: Contact,
};

/**
 * The whole home page. The hero is always first; the sections after it follow the order and on/off switches
 * set in the admin hub, the same list the navigation bar uses. Shared by the public page and the admin preview.
 */
export function HomePage() {
  const { sections } = useSiteContent();

  return (
    <>
      <HeroSection />
      {sections
        .filter((s) => s.enabled)
        .map((s) => {
          const Section = SECTION_COMPONENTS[s.id];
          return Section ? <Section key={s.id} /> : null;
        })}
    </>
  );
}

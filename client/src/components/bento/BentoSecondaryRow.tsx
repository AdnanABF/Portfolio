"use client";

import { useEffect, useState } from "react";
import { Reveal } from "@/components/effects/Reveal";
import { StackCell } from "@/components/bento/StackCell";
import { FeaturedCell } from "@/components/bento/FeaturedCell";
import { getProjects, getSkills } from "@/lib/api-client";
import type { ProjectItem, Skill } from "@/lib/types";

export function BentoSecondaryRow() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [featuredProject, setFeaturedProject] = useState<ProjectItem | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getSkills(), getProjects()]).then(([allSkills, allProjects]) => {
      if (!isMounted) return;
      setSkills(allSkills);
      const featured = allProjects.find((p) => p.isPrivate === false) || allProjects[0] || null;
      setFeaturedProject(featured);
      setIsLoaded(true);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (!isLoaded) return null;

  const hasSkills = skills.length > 0;
  const hasProject = !!featuredProject;

  if (!hasSkills && !hasProject) return null;

  return (
    <>
      {hasSkills && (
        <Reveal className={hasProject ? "md:col-span-7" : "md:col-span-12"} delay={200}>
          <StackCell initialSkills={skills} />
        </Reveal>
      )}
      {hasProject && (
        <Reveal className={hasSkills ? "md:col-span-5" : "md:col-span-12"} delay={250}>
          <FeaturedCell initialProject={featuredProject} />
        </Reveal>
      )}
    </>
  );
}

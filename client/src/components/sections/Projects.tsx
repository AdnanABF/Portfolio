"use client";

import { useEffect, useState } from "react";
import { FolderPlus } from "lucide-react";
import { Reveal } from "@/components/effects/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getProjects } from "@/lib/api-client";
import type { ProjectItem } from "@/lib/types";
import { ProjectCard } from "./ProjectCard";
import { useAdmin } from "@/components/admin/AdminContext";

export function Projects({ initialProjects }: { initialProjects?: ProjectItem[] }) {
  const { isEditMode, openEditor } = useAdmin();
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects || []);

  useEffect(() => {
    if (initialProjects && initialProjects.length > 0) return;
    let isMounted = true;
    getProjects().then((data) => {
      if (isMounted) setProjects(data);
    });
    return () => {
      isMounted = false;
    };
  }, [initialProjects]);

  if (projects.length === 0 && !isEditMode) {
    return null;
  }

  const handleAddProject = () => {
    openEditor(
      "project",
      {
        title: "",
        slug: "",
        tagline: "",
        description: "",
        heroImageUrl: "",
        techStack: [],
        githubUrl: "",
        liveUrl: "",
        isFeatured: true,
      },
      (saved) => {
        setProjects((prev) => {
          const item = saved as unknown as ProjectItem;
          const idx = prev.findIndex((p) => p.id === item.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = item;
            return next;
          }
          return [...prev, item];
        });
      }
    );
  };

  return (
    <section id="projects" className="scroll-mt-24 px-6 py-20 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <Reveal>
            <SectionHeading
              eyebrow="// work"
              title={
                <>
                  Featured <span className="text-primary">Deployments</span>
                </>
              }
              description="A selection of full-stack platforms — from family tools to community hubs to rental management."
            />
          </Reveal>
          {isEditMode && (
            <button
              onClick={handleAddProject}
              className="mb-8 inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border-2 border-line bg-accent-mint px-4 py-2 font-mono text-xs font-bold text-neutral-950 shadow-[2px_2px_0px_var(--shadow-color)] hover:scale-105 transition-all cursor-pointer"
            >
              <FolderPlus className="h-4 w-4" />
              <span>+ Add Project</span>
            </button>
          )}
        </div>

        {projects.length === 0 && isEditMode ? (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-line p-12 text-center bg-surface">
            <p className="font-mono text-sm text-muted">No projects found in database.</p>
            <button
              onClick={handleAddProject}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border-2 border-line bg-primary px-4 py-2 font-mono text-xs font-bold text-white shadow-[2px_2px_0px_var(--shadow-color)] hover:opacity-90 transition-all cursor-pointer"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Create First Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <Reveal key={project.id} delay={(index % 3) * 100}>
                <ProjectCard project={project} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

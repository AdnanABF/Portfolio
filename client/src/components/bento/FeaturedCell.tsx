"use client";

import { useEffect, useState } from "react";
import { ArrowRight, FolderGit2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getProjects } from "@/lib/api-client";
import type { ProjectItem } from "@/lib/types";

export function FeaturedCell({ initialProject }: { initialProject?: ProjectItem }) {
  const [project, setProject] = useState<ProjectItem | null>(initialProject || null);

  useEffect(() => {
    if (initialProject) return;
    let isMounted = true;
    getProjects().then((projects) => {
      if (!isMounted) return;
      const featured = projects.find((p) => p.isPrivate === false) || projects[0] || null;
      setProject(featured);
    });
    return () => {
      isMounted = false;
    };
  }, [initialProject]);

  if (!project) return null;

  return (
    <Card className="flex h-full flex-col gap-3 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted">
          <FolderGit2 size={18} className="text-primary" />
          <span className="font-mono text-xs">Featured project</span>
        </div>
        <Link
          href={`/projects/${project.slug}`}
          aria-label="View project"
          className="text-muted transition-colors hover:text-primary"
        >
          <ArrowRight size={18} />
        </Link>
      </div>
      <h3 className="text-lg font-bold text-foreground">{project.title}</h3>
      <div className="flex flex-wrap gap-2">
        {project.techStack.slice(0, 4).map((tech) => (
          <Badge key={tech}>{tech}</Badge>
        ))}
      </div>
    </Card>
  );
}

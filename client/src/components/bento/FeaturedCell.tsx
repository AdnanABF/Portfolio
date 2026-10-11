import { ArrowRight, FolderGit2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PROJECTS } from "@/lib/data";

export function FeaturedCell() {
  const project = PROJECTS[0];
  if (!project) return null;
  return (
    <Card className="flex h-full flex-col gap-3 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted">
          <FolderGit2 size={18} className="text-primary" />
          <span className="font-mono text-xs">Featured project</span>
        </div>
        <Link
          href="/#projects"
          aria-label="View projects"
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

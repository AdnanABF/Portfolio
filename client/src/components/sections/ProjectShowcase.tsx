"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/effects/Reveal";
import { Badge } from "@/components/ui/Badge";
import type { ProjectItem } from "@/lib/types";
import { ProjectCover } from "./ProjectCover";
import { ProjectLinks } from "./ProjectLinks";

const BADGE_COLORS: Array<"yellow" | "mint" | "violet" | "coral" | "sky"> = ["mint", "coral", "yellow", "sky", "violet"];

/**
 * One project as a showcase row: a large cover (its own image, or a designed cover with its name) on one side, the story on the other, and the sides swap from one
 * project to the next. On phones the cover sits above the text. `badge` (for example "Ongoing, 2025") comes from
 * the bold first line of the project's details text.
 */
export function ProjectShowcase({ project, index }: { project: ProjectItem; index: number }) {
  const flipped = index % 2 === 1;
  const number = String(index + 1).padStart(2, "0");
  const href = `/projects/${project.slug}`;

  return (
    <Reveal>
      <article className={`group grid items-center gap-6 md:grid-cols-12 md:gap-10 ${flipped ? "md:[direction:rtl]" : ""}`}>
        <Link
          href={href}
          aria-label={`View ${project.title} details`}
          className="relative block overflow-hidden rounded-2xl border-3 border-line bg-surface shadow-[6px_6px_0px_var(--shadow-color)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[9px_9px_0px_var(--shadow-color)] md:col-span-7 md:[direction:ltr]"
        >
          <ProjectCover project={project} number={number} className="aspect-[16/10]" />
        </Link>

        <div className="flex flex-col gap-4 md:col-span-5 md:[direction:ltr]">
          {project.badge ? (
            <span className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-line bg-accent-mint px-3 py-1 font-mono text-[11px] font-bold text-neutral-950">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-950" aria-hidden="true" />
              {project.badge}
            </span>
          ) : null}

          <h3 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            <Link href={href} className="transition-colors hover:text-primary">
              {project.title}
            </Link>
          </h3>

          <p className="leading-relaxed text-muted">{project.description}</p>

          <ul className="flex flex-wrap gap-2" aria-label="Technologies">
            {project.techStack.map((tech, i) => (
              <li key={tech}>
                <Badge color={BADGE_COLORS[i % BADGE_COLORS.length]}>{tech}</Badge>
              </li>
            ))}
          </ul>

          <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href={href}
              className="neo-button-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-bold"
            >
              View details <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <ProjectLinks project={project} />
          </div>
        </div>
      </article>
    </Reveal>
  );
}

import Image from "next/image";
import type { ProjectItem } from "@/lib/types";

/** The site's shared social image is only a stand-in, so it does not count as a project's own picture. */
const PLACEHOLDER_IMAGES = new Set(["", "/og-image.png"]);

export function hasOwnImage(project: Pick<ProjectItem, "imageUrl">): boolean {
  return !PLACEHOLDER_IMAGES.has(project.imageUrl);
}

const COVER_COLORS = ["bg-accent-mint", "bg-accent-yellow", "bg-accent-sky", "bg-accent-violet", "bg-accent-coral"] as const;

/** The same project always gets the same colour, on the home page and on its own page. */
function colorFor(slug: string): string {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COVER_COLORS[hash % COVER_COLORS.length];
}

/**
 * The picture for a project. A project with its own image shows it. A project without one gets a designed cover
 * instead of a stand-in photo: a coloured, dotted panel with a code-window bar, the project name as large type,
 * and its technologies set like a manifest. `number` is the small label in the corner (leave it out on its own page).
 */
export function ProjectCover({
  project,
  number,
  priority = false,
  className = "",
}: {
  project: Pick<ProjectItem, "slug" | "title" | "imageUrl" | "techStack">;
  number?: string;
  priority?: boolean;
  className?: string;
}) {
  if (hasOwnImage(project)) {
    return (
      <div className={`relative w-full overflow-hidden ${className}`}>
        <Image
          src={project.imageUrl}
          alt={project.title}
          width={1200}
          height={750}
          priority={priority}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {number ? <NumberLabel>{number}</NumberLabel> : null}
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${project.title} project cover`}
      className={`relative flex w-full flex-col overflow-hidden text-neutral-950 ${colorFor(project.slug)} ${className}`}
      style={{ backgroundImage: "radial-gradient(rgba(10,10,10,0.16) 1.5px, transparent 1.5px)", backgroundSize: "18px 18px" }}
    >
      {/* Code-window bar */}
      <div className="flex items-center gap-2 border-b-2 border-neutral-950 bg-neutral-950/10 px-4 py-2.5 backdrop-blur-[1px]">
        <span className="h-2.5 w-2.5 rounded-full border-2 border-neutral-950" />
        <span className="h-2.5 w-2.5 rounded-full border-2 border-neutral-950" />
        <span className="h-2.5 w-2.5 rounded-full border-2 border-neutral-950" />
        <span className="ml-2 truncate font-mono text-[11px] font-bold">~/projects/{project.slug}</span>
      </div>

      {/* The name */}
      <div className="flex flex-1 items-center px-6 py-6 sm:px-10">
        <p
          className="font-black leading-[0.95] tracking-tight break-words [text-shadow:4px_4px_0px_rgba(255,255,255,0.55)]"
          style={{ fontSize: "clamp(2rem, 6.5vw, 4rem)" }}
        >
          {project.title}
        </p>
      </div>

      {/* Technologies, like a manifest */}
      {project.techStack.length > 0 ? (
        <p className="border-t-2 border-neutral-950 bg-neutral-950/10 px-5 py-2.5 font-mono text-[11px] leading-relaxed font-bold sm:text-xs">
          <span className="opacity-60">{"// "}</span>
          {project.techStack.slice(0, 5).join("  ·  ")}
        </p>
      ) : null}

      {number ? <NumberLabel>{number}</NumberLabel> : null}
    </div>
  );
}

function NumberLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute top-3 right-3 rounded-lg border-2 border-neutral-950 bg-white px-2.5 py-1 font-mono text-xs font-black text-neutral-950">
      {children}
    </span>
  );
}

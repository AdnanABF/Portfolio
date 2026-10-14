"use client";

import { Edit3, ExternalLink, FolderGit2, Lock, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { ProjectItem } from "@/lib/types";
import { useAdmin } from "@/components/admin/AdminContext";

export function ProjectCard({ project }: { project: ProjectItem }) {
  const { isEditMode, openEditor } = useAdmin();

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden">
      {isEditMode && (
        <button
          onClick={() => openEditor("project", project as unknown as Record<string, unknown>)}
          className="absolute top-3 right-3 z-30 flex items-center gap-1 rounded-lg border-2 border-line bg-accent-mint px-2.5 py-1 font-mono text-xs font-bold text-neutral-950 shadow-[2px_2px_0px_var(--shadow-color)] hover:scale-105 transition-all cursor-pointer"
        >
          <Edit3 className="h-3 w-3" />
          <span>Edit</span>
        </button>
      )}

      <Link
        href={`/projects/${project.slug}`}
        className="relative block h-48 overflow-hidden"
        aria-label={`View ${project.title} details`}
      >
        <Image
          src={project.imageUrl}
          alt={project.title}
          width={600}
          height={400}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </Link>

      <div className="flex grow flex-col p-6">
        <div className="mb-3 flex items-start justify-between gap-2">
          <Link
            href={`/projects/${project.slug}`}
            className="text-xl font-bold text-foreground transition-colors hover:text-primary"
          >
            {project.title}
          </Link>
          <FolderGit2
            size={20}
            className="mt-1 shrink-0 text-muted transition-colors group-hover:text-primary"
          />
        </div>

        <p className="mb-4 text-sm leading-relaxed text-muted">
          {project.description}
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {project.techStack.map((tech, i) => {
            const colors: Array<"yellow" | "mint" | "violet" | "coral" | "sky"> = [
              "mint",
              "coral",
              "yellow",
              "sky",
              "violet",
            ];
            return (
              <Badge key={tech} color={colors[i % colors.length]}>
                {tech}
              </Badge>
            );
          })}
        </div>

        <ProjectLinks project={project} />
      </div>
    </Card>
  );
}

function ProjectLinks({ project }: { project: ProjectItem }) {
  const router = useRouter();
  const [requestOpen, setRequestOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setRequestOpen(false), []);

  useEffect(() => {
    if (!requestOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestOpen, close]);

  const confirmRequest = () => {
    close();
    // Step 10's contact section reads ?request= to prefill the form.
    router.push(`/?request=${project.slug}#contact`);
  };

  return (
    <>
      <div className="mt-auto flex items-center gap-4 border-t border-line pt-4">
        {project.githubUrl &&
          (project.isPrivate ? (
            <button
              type="button"
              onClick={() => setRequestOpen(true)}
              title="Private repository — request access"
              className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
            >
              <FolderGit2 size={16} /> Code
              <Lock size={12} className="text-primary" />
            </button>
          ) : (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
            >
              <FolderGit2 size={16} /> Code
            </a>
          ))}
        {project.liveUrl && (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-2 text-sm text-muted transition-colors hover:text-primary"
          >
            Live Demo <ExternalLink size={16} />
          </a>
        )}
      </div>

      {requestOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="private-repo-title"
            aria-describedby="private-repo-desc"
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-2xl"
          >
            <div className="mb-6 flex items-start justify-between">
              <div className="rounded-lg bg-primary/10 p-3">
                <Lock size={24} className="text-primary" />
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close access request dialog"
                className="text-muted transition-colors hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <h3
              id="private-repo-title"
              className="mb-2 text-2xl font-bold text-foreground"
            >
              Private Repository
            </h3>
            <p
              id="private-repo-desc"
              className="mb-8 leading-relaxed text-muted"
            >
              The source code for{" "}
              <span className="font-semibold text-foreground">
                “{project.title}”
              </span>{" "}
              is currently private. Send a request and you’ll be redirected to
              the contact form with the message prefilled.
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={confirmRequest}
                className="w-full rounded-lg bg-primary py-3 font-bold text-white transition-all hover:bg-primary-strong dark:text-black"
              >
                Yes, Send Request
              </button>
              <button
                type="button"
                onClick={close}
                className="w-full rounded-lg border border-line bg-cream py-3 font-semibold text-foreground transition-all hover:bg-line/40 dark:bg-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

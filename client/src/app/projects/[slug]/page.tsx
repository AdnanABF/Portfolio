import { Suspense } from "react";
import type { Metadata } from "next";
import { ExternalLink, FolderGit2, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getProject } from "@/lib/api-client";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Project not found" };
  return {
    title: `${project.title} | Adnan Bin Farook`,
    description: project.description,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: `${project.title} | Adnan Bin Farook`,
      description: project.description,
      url: `/projects/${project.slug}`,
      images: [{ url: project.imageUrl }],
    },
  };
}

async function ProjectDetailContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  return (
    <article className="mx-auto max-w-4xl px-6 pt-28 pb-16 md:px-12">
      <Link
        href="/#projects"
        className="mb-6 inline-flex items-center gap-2 font-mono text-sm text-muted transition-colors hover:text-primary"
      >
        ← All projects
      </Link>

      <div className="relative mb-8 overflow-hidden rounded-2xl border border-line">
        <Image
          src={project.imageUrl}
          alt={project.title}
          width={1200}
          height={630}
          priority
          className="h-auto w-full object-cover"
        />
      </div>

      <div className="mb-3 flex items-center gap-2 font-mono text-sm text-primary">
        <FolderGit2 size={16} />
        Case study
        {project.isPrivate && (
          <span className="inline-flex items-center gap-1">
            <Lock size={12} /> Private repo
          </span>
        )}
      </div>

      <h1 className="mb-4 text-3xl font-black tracking-tight text-foreground md:text-5xl">
        {project.title}
      </h1>

      <p className="mb-6 max-w-2xl text-lg leading-relaxed text-muted">
        {project.description}
      </p>

      <Card className="mb-8 p-6">
        <h2 className="mb-4 font-mono text-sm text-muted">Tech stack</h2>
        <div className="flex flex-wrap gap-2">
          {project.techStack.map((tech) => (
            <Badge key={tech}>{tech}</Badge>
          ))}
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        {project.githubUrl && !project.isPrivate && (
          <LinkButton
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FolderGit2 size={18} /> View Code
          </LinkButton>
        )}
        {project.githubUrl && project.isPrivate && (
          <LinkButton href={`/?request=${project.slug}#contact`}>
            <Lock size={18} /> Request Access
          </LinkButton>
        )}
        {project.liveUrl && (
          <LinkButton
            href={project.liveUrl}
            variant="secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Live Demo <ExternalLink size={18} />
          </LinkButton>
        )}
      </div>

      <p className="mt-8 font-mono text-xs text-muted">
        {SITE_URL}/projects/{project.slug}
      </p>
    </article>
  );
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-6 pt-28 pb-16 md:px-12">
          <div className="h-64 animate-pulse rounded-2xl border border-line bg-surface/50" />
        </div>
      }
    >
      <ProjectDetailContent params={params} />
    </Suspense>
  );
}

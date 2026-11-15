"use client";

import { CodeXml, Download, Globe, Link2, Mail, Phone, Terminal } from "lucide-react";
import Image from "next/image";
import { ParticleField } from "@/components/effects/ParticleField";
import { useSiteContent } from "@/components/site/SiteContentProvider";
import { LinkButton } from "@/components/ui/Button";
import { trackCvDownload } from "@/lib/api-client";
import type { LinkItem } from "@/lib/homepage";
import { GitHubIcon, LinkedInIcon } from "./SocialIcons";

export function HeroCell() {
  const { profile, links } = useSiteContent();
  const heroLinks = links.filter((l) => l.showInHero);

  return (
    <div className="neo-card relative h-full overflow-hidden p-8 md:p-10">
      <ParticleField />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(35,108,137,0.08),transparent_70%)]" />

      <div className="relative flex flex-col items-start gap-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {profile.photoUrl ? (
            <div className="group relative h-32 w-32 shrink-0 md:h-36 md:w-36">
              <div className="relative h-full w-full rounded-2xl border-2 border-line bg-surface p-1 shadow-[3px_3px_0px_var(--shadow-color)]">
                <div className="relative h-full w-full overflow-hidden rounded-xl bg-surface">
                  <Image
                    src={profile.photoUrl}
                    alt={profile.photoAlt || profile.name}
                    width={144}
                    height={144}
                    priority
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {profile.greeting ? (
            <div className="flex items-center gap-2 rounded-xl border-2 border-line bg-accent-yellow px-4 py-2 shadow-[3px_3px_0px_var(--shadow-color)] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px]">
              <Terminal size={15} className="text-neutral-950 dark:text-amber-300" />
              <span className="font-mono text-sm font-black text-neutral-950 dark:text-amber-200">
                {profile.greeting}
              </span>
            </div>
          ) : null}
        </div>

        {profile.headline || profile.headlineHighlight ? (
          <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground md:text-5xl">
            {profile.headline}
            {profile.headline && profile.headlineHighlight ? " " : ""}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {profile.headlineHighlight}
            </span>
          </h1>
        ) : null}

        {profile.subtitle ? (
          <p className="max-w-2xl text-lg leading-relaxed text-muted">{profile.subtitle}</p>
        ) : null}

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {profile.cvUrl ? (
            <div onClick={() => trackCvDownload("hero")}>
              <LinkButton href={profile.cvUrl} download>
                {profile.cvButtonLabel || "Download CV"} <Download size={18} />
              </LinkButton>
            </div>
          ) : null}
          {profile.projectsButtonLabel ? (
            <LinkButton href="/#projects" variant="secondary">
              <CodeXml size={18} /> {profile.projectsButtonLabel}
            </LinkButton>
          ) : null}
        </div>

        {heroLinks.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            {heroLinks.map((link) => (
              <SocialLink key={link.id} link={link} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LinkIcon({ kind }: { kind: LinkItem["kind"] }) {
  switch (kind) {
    case "github":
      return <GitHubIcon />;
    case "linkedin":
      return <LinkedInIcon />;
    case "email":
      return <Mail size={20} />;
    case "phone":
      return <Phone size={20} />;
    case "website":
      return <Globe size={20} />;
    default:
      return <Link2 size={20} />;
  }
}

function SocialLink({ link }: { link: LinkItem }) {
  // Mail and phone links open the visitor's own app; everything else opens in a new tab.
  const external = !/^(mailto:|tel:)/i.test(link.url) && !link.url.startsWith("/");
  return (
    <a
      href={link.url}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={link.label}
      title={link.label}
      className="rounded-xl border border-line bg-surface p-3 text-muted transition-all hover:-translate-y-1 hover:border-primary/50 hover:text-foreground"
    >
      <LinkIcon kind={link.kind} />
    </a>
  );
}

"use client";

import { useState } from "react";
import { CodeXml, Download, Edit3, Mail, Terminal } from "lucide-react";
import Image from "next/image";
import { ParticleField } from "@/components/effects/ParticleField";
import { LinkButton } from "@/components/ui/Button";
import { SOCIALS } from "@/lib/site";
import { useAdmin } from "@/components/admin/AdminContext";
import { trackCvDownload } from "@/lib/api-client";
import { GitHubIcon, LinkedInIcon } from "./SocialIcons";

export function HeroCell() {
  const { isEditMode, openEditor } = useAdmin();
  const [photoUrl, setPhotoUrl] = useState("/adnan_photo.webp");
  const [cvUrl, setCvUrl] = useState("/Adnan_CV.pdf");

  return (
    <div className="neo-card relative h-full overflow-hidden p-8 md:p-10">
      <ParticleField />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(35,108,137,0.08),transparent_70%)]" />

      {isEditMode && (
        <button
          onClick={() =>
            openEditor(
              "setting",
              {
                key: "hero_photo_cv",
                value: JSON.stringify({ photoUrl, cvUrl }, null, 2),
              },
              (saved) => {
                try {
                  const parsed = JSON.parse(saved.value as string);
                  if (parsed.photoUrl) setPhotoUrl(parsed.photoUrl);
                  if (parsed.cvUrl) setCvUrl(parsed.cvUrl);
                } catch {
                  // ignore
                }
              }
            )
          }
          className="absolute top-4 right-4 z-20 flex items-center gap-1 rounded-lg border-2 border-line bg-accent-mint px-2.5 py-1 font-mono text-[11px] font-bold text-neutral-950 shadow-[2px_2px_0px_var(--shadow-color)] hover:scale-105 transition-all cursor-pointer"
        >
          <Edit3 className="h-3 w-3" />
          <span>Edit Hero & Media</span>
        </button>
      )}

      <div className="relative flex flex-col items-start gap-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="group relative h-32 w-32 shrink-0 md:h-36 md:w-36">
            <div className="relative h-full w-full rounded-2xl border-2 border-line bg-surface p-1 shadow-[3px_3px_0px_var(--shadow-color)]">
              <div className="relative h-full w-full overflow-hidden rounded-xl bg-surface">
                <Image
                  src={photoUrl}
                  alt="Adnan Bin Farook"
                  width={144}
                  height={144}
                  priority
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border-2 border-line bg-accent-yellow px-4 py-2 shadow-[3px_3px_0px_var(--shadow-color)] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px]">
            <Terminal size={15} className="text-neutral-950 dark:text-amber-300" />
            <span className="font-mono text-sm font-black text-neutral-950 dark:text-amber-200">
              Hello, I&apos;m Adnan
            </span>
          </div>
        </div>

        <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground md:text-5xl">
          Architecting{" "}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Digital Excellence
          </span>
        </h1>

        <p className="max-w-2xl text-lg leading-relaxed text-muted">
          A Senior Software Engineer bridging the gap between scalable{" "}
          <span className="font-semibold text-foreground">.NET ecosystems</span>{" "}
          and immersive{" "}
          <span className="font-semibold text-foreground">
            React interfaces
          </span>
          .
        </p>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div onClick={() => trackCvDownload("hero")}>
            <LinkButton href={cvUrl} download>
              Download CV <Download size={18} />
            </LinkButton>
          </div>
          <LinkButton href="/#projects" variant="secondary">
            <CodeXml size={18} /> View Projects
          </LinkButton>
        </div>

        <div className="flex items-center gap-3">
          <SocialLink href={SOCIALS.github} label="GitHub">
            <GitHubIcon />
          </SocialLink>
          <SocialLink href={SOCIALS.linkedin} label="LinkedIn">
            <LinkedInIcon />
          </SocialLink>
          <SocialLink href={SOCIALS.email} label="Email">
            <Mail size={20} />
          </SocialLink>
        </div>
      </div>
    </div>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  const isEmail = href.startsWith("mailto:");
  return (
    <a
      href={href}
      target={isEmail ? undefined : "_blank"}
      rel={isEmail ? undefined : "noopener noreferrer"}
      aria-label={label}
      className="rounded-xl border border-line bg-surface p-3 text-muted transition-all hover:-translate-y-1 hover:border-primary/50 hover:text-foreground"
    >
      {children}
    </a>
  );
}

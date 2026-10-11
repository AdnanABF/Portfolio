import { CodeXml, Download, Terminal } from "lucide-react";
import { Mail } from "lucide-react";
import Image from "next/image";
import { ParticleField } from "@/components/effects/ParticleField";
import { LinkButton } from "@/components/ui/Button";
import { SOCIALS } from "@/lib/site";
import { GitHubIcon, LinkedInIcon } from "./SocialIcons";

export function HeroCell() {
  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-line bg-surface p-8 shadow-[0_1px_0_rgba(28,25,23,0.04),0_8px_24px_-12px_rgba(28,25,23,0.12)] md:p-10 dark:shadow-none">
      <ParticleField />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(14,116,144,0.06),transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(0,210,255,0.05),transparent_70%)]" />

      <div className="relative flex flex-col items-start gap-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="group relative h-32 w-32 shrink-0 md:h-36 md:w-36">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-secondary to-primary opacity-20 blur-xl transition-opacity duration-500 group-hover:opacity-40" />
            <div className="relative h-full w-full rounded-full bg-gradient-to-br from-primary to-secondary p-1 shadow-lg">
              <div className="relative h-full w-full overflow-hidden rounded-full bg-surface">
                <Image
                  src="/adnan_photo.webp"
                  alt="Adnan Bin Farook"
                  width={144}
                  height={144}
                  priority
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-line bg-cream px-4 py-1.5 dark:bg-surface">
            <Terminal size={14} className="text-primary" />
            <span className="font-mono text-sm text-muted">
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
          <LinkButton href="/Adnan_CV.pdf" download>
            Download CV <Download size={18} />
          </LinkButton>
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

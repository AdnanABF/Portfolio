"use client";

import { Award, ExternalLink } from "lucide-react";
import { Reveal } from "@/components/effects/Reveal";
import { useSiteContent, useSiteLists } from "@/components/site/SiteContentProvider";
import { sectionOf } from "@/lib/homepage";
import { SectionHead } from "./SectionHead";

/** Certificates and courses as a tidy list: title, who issued it, when, and a link to the credential if there is one. */
export function Certifications() {
  const content = useSiteContent();
  const items = useSiteLists().certifications;

  if (items.length === 0) return null;

  return (
    <section id="certifications" className="scroll-mt-24 px-6 py-20 md:px-12">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <SectionHead section={sectionOf(content, "certifications")} />
        </Reveal>

        <ul className="neo-card divide-y divide-line overflow-hidden">
          {items.map((cert) => (
            <li key={cert.id} className="flex items-center gap-4 p-4 sm:p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-line bg-accent-yellow text-neutral-950 shadow-[2px_2px_0px_var(--shadow-color)]">
                <Award size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground">{cert.title}</p>
                <p className="font-mono text-xs text-muted">{[cert.issuer, cert.issuedOn].filter(Boolean).join(" · ")}</p>
              </div>
              {cert.credentialUrl ? (
                <a
                  href={cert.credentialUrl}
                  target={cert.credentialUrl.startsWith("/") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs font-bold text-primary hover:underline"
                >
                  <span className="max-sm:sr-only">View credential</span>
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

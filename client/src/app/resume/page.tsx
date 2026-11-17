"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Mail, MapPin, Printer } from "lucide-react";
import { useSiteContent } from "@/components/site/SiteContentProvider";
import { getExperience, getSkills } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import type { ExperienceItem, Skill } from "@/lib/types";

export default function ResumePage() {
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const { profile, links, location } = useSiteContent();
  const cvUrl = profile.cvUrl;

  useEffect(() => {
    let isMounted = true;
    getExperience().then((data) => {
      if (isMounted) setExperience(data);
    });
    getSkills().then((data) => {
      if (isMounted) setSkills(data);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDownload = () => {
    if (!cvUrl) return;
    window.open(cvUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-background pt-28 pb-16 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="mb-8 flex items-center justify-between border-b-2 border-line pb-4 print:hidden">
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-xs font-bold text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Portfolio</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl border-2 border-line bg-surface px-4 py-2 font-mono text-xs font-bold shadow-[2px_2px_0px_var(--shadow-color)] hover:bg-cream cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Resume</span>
            </button>
            {cvUrl ? (
              <Button onClick={handleDownload} className="py-2 text-xs">
                <Download className="h-3.5 w-3.5" />
                <span>Download PDF</span>
              </Button>
            ) : null}
          </div>
        </div>

        {/* Printable Resume Container */}
        <div className="rounded-2xl border-3 border-line bg-surface p-8 sm:p-12 shadow-[6px_6px_0px_var(--shadow-color)] print:border-none print:shadow-none print:p-0">
          {/* Header */}
          <div className="border-b-2 border-line pb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              {profile.name}
            </h1>
            <p className="mt-1 font-mono text-base font-bold text-primary">{profile.role}</p>

            <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-xs text-muted">
              {location.address ? (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-secondary" />
                  {location.address}
                </span>
              ) : null}
              {links.map((link) => (
                <a key={link.id} href={link.url} className="flex items-center gap-1 hover:underline font-bold text-foreground">
                  {link.kind === "email" ? <Mail className="h-3.5 w-3.5 text-secondary" /> : null}
                  {link.url.replace(/^(mailto:|tel:|https?:\/\/)/i, "").replace(/\/$/, "")}
                </a>
              ))}
            </div>
          </div>

          {/* Professional Summary */}
          <div className="mt-8">
            <h2 className="font-mono text-xs font-extrabold uppercase tracking-widest text-primary">
              {"// Professional Summary"}
            </h2>
            <p className="mt-2 text-sm text-foreground/90 leading-relaxed">
              {profile.subtitle}
            </p>
          </div>

          {/* Work Experience */}
          {experience.length > 0 && (
            <div className="mt-8">
              <h2 className="font-mono text-xs font-extrabold uppercase tracking-widest text-primary">
                {"// Work Experience"}
              </h2>

              <div className="mt-4 space-y-6">
                {experience.map((exp) => (
                  <div key={exp.id} className="relative pl-4 border-l-2 border-line">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="font-bold text-base text-foreground">{exp.role}</h3>
                      <span className="font-mono text-xs text-muted font-bold">{exp.period}</span>
                    </div>
                    <div className="font-mono text-xs text-secondary font-semibold">{exp.company}</div>

                    <ul className="mt-2.5 list-disc list-inside space-y-1 text-xs text-foreground/80">
                      {(exp.description || []).map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Technical Competencies */}
          {skills.length > 0 && (
            <div className="mt-8">
              <h2 className="font-mono text-xs font-extrabold uppercase tracking-widest text-primary">
                {"// Core Technical Competencies"}
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill.name}
                    className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 font-mono text-xs font-bold text-foreground"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          <div className="mt-8 border-t-2 border-line pt-6">
            <h2 className="font-mono text-xs font-extrabold uppercase tracking-widest text-primary">
              {"// Education"}
            </h2>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs">
              <span className="font-bold text-foreground">Bachelor of Computer Applications (BCA)</span>
              <span className="font-mono text-muted">University of Calicut</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Briefcase, Calendar } from "lucide-react";
import { Reveal } from "@/components/effects/Reveal";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EXPERIENCE } from "@/lib/data";

export function Experience() {
  return (
    <section id="experience" className="scroll-mt-24 px-6 py-20 md:px-12">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <SectionHeading
            eyebrow="// career"
            title={
              <>
                Professional <span className="text-primary">Odyssey</span>
              </>
            }
          />
        </Reveal>

        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute top-0 left-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/40 to-transparent md:left-1/2" />

          <div className="space-y-8">
            {EXPERIENCE.map((exp, index) => (
              <Reveal key={exp.id} delay={index * 100}>
                <div
                  className={`relative flex flex-col items-stretch md:flex-row md:items-center ${
                    index % 2 === 0 ? "md:flex-row-reverse" : ""
                  }`}
                >
                  {/* Dot on Line */}
                  <div className="absolute top-8 left-0 z-10 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-primary bg-background md:top-1/2 md:left-1/2 md:-translate-y-1/2" />

                  {/* Content Card */}
                  <div
                    className={`w-full pl-8 md:w-5/12 md:pl-0 ${
                      index % 2 === 0
                        ? "md:pl-12"
                        : "md:pr-12 md:text-right"
                    }`}
                  >
                    <Card className="p-6">
                      <div
                        className={`mb-2 flex items-center gap-2 font-mono text-sm text-primary ${
                          index % 2 !== 0 && "md:justify-end"
                        }`}
                      >
                        <Calendar size={14} />
                        {exp.period}
                      </div>

                      <h3 className="mb-1 text-xl font-bold text-foreground">
                        {exp.role}
                      </h3>

                      <div
                        className={`mb-4 flex items-center gap-2 text-muted ${
                          index % 2 !== 0 && "md:justify-end"
                        }`}
                      >
                        <Briefcase size={14} />
                        {exp.company}
                      </div>

                      <ul className="mb-4 list-inside list-disc space-y-2 text-sm text-muted">
                        {exp.description.map((desc) => (
                          <li key={desc.slice(0, 32)}>{desc}</li>
                        ))}
                      </ul>

                      <div
                        className={`flex flex-wrap gap-2 ${
                          index % 2 !== 0 && "md:justify-end"
                        }`}
                      >
                        {exp.tech.map((t) => (
                          <Badge key={t}>{t}</Badge>
                        ))}
                      </div>
                    </Card>
                  </div>

                  {/* Empty Space for opposite side */}
                  <div className="hidden w-5/12 md:block" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

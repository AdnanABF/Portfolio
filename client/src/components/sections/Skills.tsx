import { Reveal } from "@/components/effects/Reveal";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SKILLS } from "@/lib/data";

const CATEGORIES = Array.from(new Set(SKILLS.map((s) => s.category)));

export function Skills() {
  return (
    <section
      id="skills"
      className="scroll-mt-24 bg-cream/50 px-6 py-20 md:px-12"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <SectionHeading
            eyebrow="// arsenal"
            title={
              <>
                Tech <span className="text-primary">Arsenal</span>
              </>
            }
            description="A hybrid skillset combining enterprise-grade robustness with modern agility."
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {CATEGORIES.map((category, catIndex) => (
            <Reveal key={category} delay={catIndex * 100}>
              <Card className="h-full p-6">
                <h3 className="mb-6 border-b border-line pb-3 text-xl font-bold text-foreground">
                  <span className="mr-2 text-primary">/</span>
                  {category}
                </h3>

                <ul className="space-y-4">
                  {SKILLS.filter((s) => s.category === category).map(
                    (skill) => (
                      <li key={skill.name}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-2">
                          <span className="font-mono text-sm text-foreground">
                            {skill.name}
                          </span>
                          <span className="font-mono text-xs text-muted">
                            {skill.level}%
                          </span>
                        </div>
                        <div
                          role="progressbar"
                          aria-valuenow={skill.level}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${skill.name} proficiency`}
                          className="h-1.5 overflow-hidden rounded-full bg-line/60"
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                            style={{ width: `${skill.level}%` }}
                          />
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

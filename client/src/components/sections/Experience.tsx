"use client";

import { useEffect, useState } from "react";
import { Briefcase, Calendar, Edit3, PlusCircle } from "lucide-react";
import { Reveal } from "@/components/effects/Reveal";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useAdmin } from "@/components/admin/AdminContext";
import { getExperience } from "@/lib/api-client";
import type { ExperienceItem } from "@/lib/types";

export function Experience({ initialItems }: { initialItems?: ExperienceItem[] }) {
  const { isEditMode, openEditor } = useAdmin();
  const [items, setItems] = useState<ExperienceItem[]>(initialItems || []);

  useEffect(() => {
    if (initialItems && initialItems.length > 0) return;
    let isMounted = true;
    getExperience().then((data) => {
      if (isMounted) setItems(data);
    });
    return () => {
      isMounted = false;
    };
  }, [initialItems]);

  if (items.length === 0 && !isEditMode) {
    return null;
  }

  const handleAddExperience = () => {
    openEditor(
      "experience",
      {
        role: "",
        company: "",
        period: "",
        location: "",
        achievementsText: "",
      },
      (saved) => {
        const achievements = Array.isArray(saved.achievements)
          ? (saved.achievements as string[])
          : typeof saved.achievementsText === "string"
          ? saved.achievementsText.split("\n").map((s) => s.trim()).filter(Boolean)
          : [];

        const newExp: ExperienceItem = {
          id: (saved.id as string) || String(Date.now()),
          role: (saved.role as string) || "",
          company: (saved.company as string) || "",
          period: (saved.period as string) || "",
          description: achievements,
          tech: [],
        };

        setItems((prev) => {
          const idx = prev.findIndex((e) => e.id === newExp.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = newExp;
            return next;
          }
          return [...prev, newExp];
        });
      }
    );
  };

  return (
    <section id="experience" className="scroll-mt-24 px-6 py-20 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
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
          {isEditMode && (
            <button
              onClick={handleAddExperience}
              className="mb-8 inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border-2 border-line bg-accent-mint px-4 py-2 font-mono text-xs font-bold text-neutral-950 shadow-[2px_2px_0px_var(--shadow-color)] hover:scale-105 transition-all cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Add Experience</span>
            </button>
          )}
        </div>

        {items.length === 0 && isEditMode ? (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-line p-12 text-center bg-surface">
            <p className="font-mono text-sm text-muted">No experience entries found in database.</p>
            <button
              onClick={handleAddExperience}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border-2 border-line bg-primary px-4 py-2 font-mono text-xs font-bold text-white shadow-[2px_2px_0px_var(--shadow-color)] hover:opacity-90 transition-all cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create First Entry</span>
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute top-0 left-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/40 to-transparent md:left-1/2" />

            <div className="space-y-8">
              {items.map((exp, index) => (
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
                      <Card className="relative p-6">
                        {isEditMode && (
                          <button
                            onClick={() =>
                              openEditor(
                                "experience",
                                {
                                  ...exp,
                                  achievementsText: (exp.description || []).join("\n"),
                                },
                                (updated) => {
                                  setItems((prev) =>
                                    prev.map((item) => {
                                      if (item.id !== exp.id) return item;
                                      const achievements = Array.isArray(updated.achievements)
                                        ? (updated.achievements as string[])
                                        : typeof updated.achievementsText === "string"
                                        ? updated.achievementsText.split("\n")
                                        : item.description;

                                      return {
                                        ...item,
                                        role: (updated.role as string) || item.role,
                                        company: (updated.company as string) || item.company,
                                        period: (updated.period as string) || item.period,
                                        description: achievements,
                                      };
                                    })
                                  );
                                }
                              )
                            }
                            className={`absolute top-4 z-20 flex items-center gap-1 rounded-lg border-2 border-line bg-accent-mint px-2 py-0.5 font-mono text-xs font-bold text-neutral-950 shadow-[2px_2px_0px_var(--shadow-color)] hover:scale-105 transition-all cursor-pointer ${
                              index % 2 !== 0 ? "left-4" : "right-4"
                            }`}
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                        )}

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
                          {(exp.description || []).map((desc) => (
                            <li key={desc.slice(0, 32)}>{desc}</li>
                          ))}
                        </ul>

                        <div
                          className={`flex flex-wrap gap-2 ${
                            index % 2 !== 0 && "md:justify-end"
                          }`}
                        >
                          {(exp.tech || []).map((t, i) => {
                            const colors: Array<"yellow" | "mint" | "violet" | "coral" | "sky"> = [
                              "sky",
                              "mint",
                              "yellow",
                              "coral",
                              "violet",
                            ];
                            return (
                              <Badge key={t} color={colors[i % colors.length]}>
                                {t}
                              </Badge>
                            );
                          })}
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
        )}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { Reveal } from "@/components/effects/Reveal";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useAdmin } from "@/components/admin/AdminContext";
import { deleteSkill, getSkills } from "@/lib/api-client";
import type { Skill } from "@/lib/types";

const DEFAULT_CATEGORIES: Array<"Modern" | "Microsoft" | "Tools" | "Legacy"> = [
  "Modern",
  "Microsoft",
  "Tools",
  "Legacy",
];

export function Skills({ initialSkills }: { initialSkills?: Skill[] }) {
  const { isEditMode, openEditor } = useAdmin();
  const [items, setItems] = useState<Skill[]>(initialSkills || []);

  useEffect(() => {
    if (initialSkills && initialSkills.length > 0) return;
    let isMounted = true;
    getSkills().then((data) => {
      if (isMounted) {
        setItems(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [initialSkills]);

  if (items.length === 0 && !isEditMode) {
    return null;
  }

  const categories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...items.map((s) => s.category)])
  );

  const handleAddSkill = (category: string) => {
    openEditor(
      "skill",
      { category, level: 85, name: "" },
      (saved) => {
        setItems((prev) => {
          const newSkill = saved as unknown as Skill;
          const exists = prev.findIndex((s) => s.id && s.id === newSkill.id);
          if (exists >= 0) {
            const copy = [...prev];
            copy[exists] = newSkill;
            return copy;
          }
          return [...prev, newSkill];
        });
      }
    );
  };

  const handleEditSkill = (skill: Skill) => {
    openEditor(
      "skill",
      skill as unknown as Record<string, unknown>,
      (saved) => {
        setItems((prev) =>
          prev.map((s) => ((s.id && s.id === skill.id) || s.name === skill.name ? (saved as unknown as Skill) : s))
        );
      }
    );
  };

  const handleDeleteSkill = async (skill: Skill) => {
    if (!confirm(`Delete skill "${skill.name}"?`)) return;
    try {
      if (skill.id) {
        await deleteSkill(skill.id);
      }
      setItems((prev) => prev.filter((s) => s !== skill && s.id !== skill.id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete skill.");
    }
  };

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
          {categories.map((category, catIndex) => {
            const categorySkills = items.filter((s) => s.category === category);

            return (
              <Reveal key={category} delay={catIndex * 100}>
                <Card className="h-full p-6">
                  <div className="mb-6 flex items-center justify-between border-b border-line pb-3">
                    <h3 className="text-xl font-bold text-foreground">
                      <span className="mr-2 text-primary">/</span>
                      {category}
                    </h3>

                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => handleAddSkill(category)}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 px-2.5 py-1 font-mono text-[11px] font-bold text-primary hover:bg-primary hover:text-white transition-all cursor-pointer shadow-[1px_1px_0px_var(--shadow-color)]"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Skill</span>
                      </button>
                    )}
                  </div>

                  {categorySkills.length === 0 ? (
                    <div className="py-6 text-center font-mono text-xs text-muted">
                      No skills added in this category yet.
                    </div>
                  ) : (
                    <ul className="space-y-4">
                      {categorySkills.map((skill) => (
                        <li key={skill.id || skill.name} className="group relative">
                          <div className="mb-1.5 flex items-baseline justify-between gap-2">
                            <span className="font-mono text-sm text-foreground">
                              {skill.name}
                            </span>
                            <div className="flex items-center gap-2">
                              {isEditMode && (
                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={() => handleEditSkill(skill)}
                                    title="Edit Skill"
                                    className="rounded p-1 text-muted hover:bg-cream hover:text-primary transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSkill(skill)}
                                    title="Delete Skill"
                                    className="rounded p-1 text-muted hover:bg-accent-coral/10 hover:text-accent-coral transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                              <span className="font-mono text-xs text-muted">
                                {skill.level}%
                              </span>
                            </div>
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
                              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                              style={{ width: `${skill.level}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

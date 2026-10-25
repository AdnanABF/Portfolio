"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getSkills } from "@/lib/api-client";
import type { Skill } from "@/lib/types";

const HIGHLIGHTS = [
  "C#",
  ".NET Core",
  "ASP .NET Core MVC",
  "MSSQL",
  "React",
  "TypeScript",
  "NestJS",
  "MongoDB",
  "Azure Devops",
  "Git",
];

const BADGE_COLORS: Array<"yellow" | "mint" | "violet" | "coral" | "sky"> = [
  "coral",
  "yellow",
  "sky",
  "mint",
  "violet",
  "coral",
  "yellow",
  "mint",
  "sky",
  "violet",
];

export function StackCell({ initialSkills }: { initialSkills?: Skill[] }) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills || []);

  useEffect(() => {
    if (initialSkills && initialSkills.length > 0) return;
    let isMounted = true;
    getSkills().then((data) => {
      if (isMounted) setSkills(data);
    });
    return () => {
      isMounted = false;
    };
  }, [initialSkills]);

  const highlighted = skills.filter((s) =>
    HIGHLIGHTS.some((h) => h.toLowerCase() === s.name.toLowerCase())
  );
  const displaySkills = highlighted.length > 0 ? highlighted : skills.slice(0, 10);

  if (displaySkills.length === 0) return null;

  return (
    <Card className="flex h-full flex-col gap-4 p-6">
      <h3 className="text-lg font-bold text-foreground">
        <span className="mr-2 text-primary">/</span>Core stack
      </h3>
      <div className="flex flex-wrap gap-2">
        {displaySkills.map((skill, index) => (
          <Badge
            key={skill.name}
            color={BADGE_COLORS[index % BADGE_COLORS.length]}
          >
            {skill.name}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

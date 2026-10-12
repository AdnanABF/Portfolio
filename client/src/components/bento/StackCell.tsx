import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SKILLS } from "@/lib/data";

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

export function StackCell() {
  const skills = SKILLS.filter((s) => HIGHLIGHTS.includes(s.name));
  return (
    <Card className="flex h-full flex-col gap-4 p-6">
      <h3 className="text-lg font-bold text-foreground">
        <span className="mr-2 text-primary">/</span>Core stack
      </h3>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <Badge key={skill.name}>{skill.name}</Badge>
        ))}
      </div>
    </Card>
  );
}

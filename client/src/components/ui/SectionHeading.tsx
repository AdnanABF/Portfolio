import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: "center" | "left";
}) {
  const alignClass = align === "center" ? "text-center items-center" : "text-left items-start";
  return (
    <div className={`mb-12 flex flex-col gap-3 ${alignClass}`}>
      {eyebrow ? (
        <span className="font-mono text-sm text-primary">{eyebrow}</span>
      ) : null}
      <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl text-muted">{description}</p>
      ) : null}
    </div>
  );
}

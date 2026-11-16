import { SectionHeading } from "@/components/ui/SectionHeading";
import type { SectionItem } from "@/lib/homepage";

/** A section's heading, built from the settings in the admin hub (eyebrow, title with accent part, description). */
export function SectionHead({
  section,
  align = "center",
  compact = false,
}: {
  section: SectionItem;
  align?: "center" | "left";
  compact?: boolean;
}) {
  const hasTitle = section.title || section.titleHighlight;
  return (
    <SectionHeading
      align={align}
      compact={compact}
      eyebrow={section.eyebrow || undefined}
      title={
        hasTitle ? (
          <>
            {section.title}
            {section.title && section.titleHighlight ? " " : ""}
            <span className="text-primary">{section.titleHighlight}</span>
          </>
        ) : (
          section.label
        )
      }
      description={section.description || undefined}
    />
  );
}

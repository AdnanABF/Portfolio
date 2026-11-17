"use client";

import { useSiteContent } from "@/components/site/SiteContentProvider";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const BADGE_COLORS: Array<"yellow" | "mint" | "violet" | "coral" | "sky"> = [
  "coral",
  "yellow",
  "sky",
  "mint",
  "violet",
];

/** The short "Core stack" list in the hero area. The items are set in the admin hub. */
export function StackCell() {
  const { coreStack } = useSiteContent();
  if (coreStack.length === 0) return null;

  return (
    <Card className="flex h-full flex-col gap-4 p-6">
      <h3 className="text-lg font-bold text-foreground">
        <span className="mr-2 text-primary">/</span>Core stack
      </h3>
      <div className="flex flex-wrap gap-2">
        {coreStack.map((item, index) => (
          <Badge key={`${item}-${index}`} color={BADGE_COLORS[index % BADGE_COLORS.length]}>
            {item}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

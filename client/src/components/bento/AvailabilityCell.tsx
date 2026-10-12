import { Card } from "@/components/ui/Card";

export function AvailabilityCell() {
  return (
    <Card className="flex h-full flex-col justify-center gap-2 p-6">
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
        </span>
        <span className="font-mono text-sm text-green-700 dark:text-green-400">
          Available for work
        </span>
      </div>
      <p className="text-sm leading-relaxed text-muted">
        Open to freelance projects and full-time opportunities.
      </p>
    </Card>
  );
}

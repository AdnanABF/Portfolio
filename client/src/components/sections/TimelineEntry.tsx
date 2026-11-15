"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { Calendar, ChevronDown, MapPin } from "lucide-react";
import { Reveal } from "@/components/effects/Reveal";

/**
 * One entry in a vertical timeline (a job, a course of study). It always shows the summary: title, organisation,
 * place and period. The detail points open and close with a clear button; an entry with no details has no button.
 * The open state is owned by the caller so a section can offer "Expand all".
 */
export function TimelineEntry({
  title,
  organisation,
  icon,
  location,
  period,
  details,
  detailsLabel = "highlight",
  open,
  onToggle,
  delay = 0,
}: {
  title: string;
  organisation: string;
  icon: ReactNode;
  location?: string;
  period?: string;
  details: string[];
  /** What one point is called in the button ("highlight" or "detail"); an s is added for more than one. */
  detailsLabel?: string;
  open: boolean;
  onToggle: () => void;
  delay?: number;
}) {
  const panelId = useId();
  const hasDetails = details.length > 0;

  const summary = (
    <div className="min-w-0 flex-1 text-left">
      {period ? (
        <div className="mb-2 flex items-center gap-2 font-mono text-xs font-bold text-primary sm:text-sm">
          <Calendar size={14} className="shrink-0" />
          {period}
        </div>
      ) : null}
      <h3 className="text-lg font-bold leading-snug text-foreground sm:text-xl">{title}</h3>
      <div className="mt-1 flex items-start gap-2 text-muted">
        <span className="mt-1 shrink-0">{icon}</span>
        <span>{organisation}</span>
      </div>
      {location ? (
        <div className="mt-1 flex items-center gap-2 font-mono text-xs text-muted">
          <MapPin size={12} className="shrink-0" />
          {location}
        </div>
      ) : null}
    </div>
  );

  return (
    <Reveal delay={delay}>
      <div className="relative pl-8 sm:pl-10">
        {/* Dot on the timeline line */}
        <div className="absolute top-7 left-0 z-10 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-primary bg-background" />

        <div className="neo-card overflow-hidden">
          {hasDetails ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-controls={panelId}
              className="flex w-full cursor-pointer items-start gap-4 p-5 text-left transition-colors hover:bg-cream/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:p-6"
            >
              {summary}
              <span className="mt-1 flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-line bg-surface-2 px-2.5 py-1.5 font-mono text-[11px] font-bold text-foreground shadow-[2px_2px_0px_var(--shadow-color)]">
                <span>{open ? "Hide" : `${details.length} ${detailsLabel}${details.length === 1 ? "" : "s"}`}</span>
                <ChevronDown size={16} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
              </span>
            </button>
          ) : (
            <div className="p-5 sm:p-6">{summary}</div>
          )}

          {hasDetails ? (
            // The grid-rows trick animates between height 0 and the content's own height.
            <div
              id={panelId}
              role="region"
              className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <ul className="list-outside list-disc space-y-2 border-t border-line px-5 pt-4 pb-5 pl-9 text-sm leading-relaxed text-muted sm:px-6 sm:pb-6 sm:pl-10">
                  {details.map((point) => (
                    <li key={point.slice(0, 60)}>{point}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Reveal>
  );
}

/** The vertical line the entries hang on. */
export function TimelineList({ children }: { children: ReactNode }) {
  return (
    <div className="relative ml-2 sm:ml-4">
      <div className="absolute top-0 left-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
      <div className="space-y-6">{children}</div>
    </div>
  );
}

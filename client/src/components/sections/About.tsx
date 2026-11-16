"use client";

import { Reveal } from "@/components/effects/Reveal";
import { useSiteContent } from "@/components/site/SiteContentProvider";
import { Card } from "@/components/ui/Card";
import { sectionOf } from "@/lib/homepage";
import type { AboutCard } from "@/lib/homepage";
import { ABOUT_COLOR_CLASSES, ABOUT_ICON_COMPONENTS } from "./aboutVisuals";
import { SectionHead } from "./SectionHead";

export function About() {
  const content = useSiteContent();
  const cards = content.about.cards;

  return (
    <section id="about" className="scroll-mt-24 bg-cream/50 px-6 py-20 md:px-12">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <SectionHead section={sectionOf(content, "about")} align="left" />
        </Reveal>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          {cards.map((card, index) => (
            // Large cards take half the row, small cards a third.
            <Reveal key={card.id} className={card.size === "large" ? "md:col-span-3" : "md:col-span-2"} delay={(index % 3) * 100}>
              <AboutCardView card={card} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutCardView({ card }: { card: AboutCard }) {
  const Icon = ABOUT_ICON_COMPONENTS[card.icon] ?? ABOUT_ICON_COMPONENTS.user;
  const small = card.size !== "large";

  return (
    <Card className={`h-full ${small ? "p-6" : "p-8"}`}>
      <div className="mb-4 flex items-center gap-3">
        <div className={`rounded-lg p-2 ${ABOUT_COLOR_CLASSES[card.color] ?? ABOUT_COLOR_CLASSES.primary}`}>
          <Icon size={small ? 20 : 24} />
        </div>
        <h3 className={`font-bold text-foreground ${small ? "text-lg" : "text-xl"}`}>{card.title}</h3>
      </div>
      <p className={`leading-relaxed text-muted ${small ? "text-sm" : ""}`}>{card.text}</p>
    </Card>
  );
}

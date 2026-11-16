"use client";

import { AvailabilityCell } from "@/components/bento/AvailabilityCell";
import { BentoSecondaryRow } from "@/components/bento/BentoSecondaryRow";
import { HeroCell } from "@/components/bento/HeroCell";
import { LocationCell } from "@/components/bento/LocationCell";
import { Reveal } from "@/components/effects/Reveal";
import { useSiteContent } from "@/components/site/SiteContentProvider";

/** The top of the home page: the hero card, availability, location, core stack and the featured project. */
export function HeroSection() {
  const { availability, location } = useSiteContent();
  const showAvailability = availability.enabled;
  const showLocation = Boolean(location.title || location.address || location.timeZone);

  return (
    <section id="hero" className="px-6 pt-28 pb-16 md:px-12">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-12">
        <Reveal className="md:col-span-8 md:row-span-2" delay={0}>
          <HeroCell />
        </Reveal>
        {showAvailability && (
          <Reveal className="md:col-span-4" delay={100}>
            <AvailabilityCell />
          </Reveal>
        )}
        {showLocation && (
          <Reveal className="md:col-span-4" delay={150}>
            <LocationCell />
          </Reveal>
        )}
        <BentoSecondaryRow />
      </div>
    </section>
  );
}

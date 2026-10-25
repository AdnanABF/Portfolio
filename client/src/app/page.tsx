import { AvailabilityCell } from "@/components/bento/AvailabilityCell";
import { BentoSecondaryRow } from "@/components/bento/BentoSecondaryRow";
import { HeroCell } from "@/components/bento/HeroCell";
import { LocationCell } from "@/components/bento/LocationCell";
import { Reveal } from "@/components/effects/Reveal";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { Experience } from "@/components/sections/Experience";
import { Projects } from "@/components/sections/Projects";
import { Skills } from "@/components/sections/Skills";

export default function Home() {
  return (
    <>
      <section id="hero" className="px-6 pt-28 pb-16 md:px-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-12">
          <Reveal className="md:col-span-8 md:row-span-2" delay={0}>
            <HeroCell />
          </Reveal>
          <Reveal className="md:col-span-4" delay={100}>
            <AvailabilityCell />
          </Reveal>
          <Reveal className="md:col-span-4" delay={150}>
            <LocationCell />
          </Reveal>
          <BentoSecondaryRow />
        </div>
      </section>
      <About />
      <Experience />
      <Skills />
      <Projects />
      <Contact />
    </>
  );
}

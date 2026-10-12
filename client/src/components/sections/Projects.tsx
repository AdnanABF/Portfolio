import { Reveal } from "@/components/effects/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PROJECTS } from "@/lib/data";
import { ProjectCard } from "./ProjectCard";

export function Projects() {
  return (
    <section id="projects" className="scroll-mt-24 px-6 py-20 md:px-12">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <SectionHeading
            eyebrow="// work"
            title={
              <>
                Featured <span className="text-primary">Deployments</span>
              </>
            }
            description="A selection of full-stack platforms — from family tools to community hubs to rental management."
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.map((project, index) => (
            <Reveal key={project.id} delay={(index % 3) * 100}>
              <ProjectCard project={project} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

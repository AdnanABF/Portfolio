import { Code, Cpu, Sparkles, Sun, User } from "lucide-react";
import { Reveal } from "@/components/effects/Reveal";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function About() {
  return (
    <section id="about" className="scroll-mt-24 bg-cream/50 px-6 py-20 md:px-12">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <SectionHeading
            align="left"
            eyebrow="// profile"
            title={
              <>
                About <span className="text-primary">Me</span>
              </>
            }
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <Reveal className="md:col-span-3" delay={0}>
            <AboutCard
              icon={<User size={24} />}
              iconClass="bg-primary/10 text-primary"
              title="My Journey"
            >
              I started out in the .NET world, building the “engines” (APIs)
              that make apps run. Over time, I got curious about the full
              picture and moved into modern frontend frameworks. There’s
              something really satisfying about taking a complex backend and
              turning it into a smooth, easy-to-use experience.
            </AboutCard>
          </Reveal>

          <Reveal className="md:col-span-3" delay={100}>
            <AboutCard
              icon={<Code size={24} />}
              iconClass="bg-secondary/10 text-secondary"
              title="Development Philosophy"
            >
              I’m a “build it right” kind of developer. I believe solid
              architecture and clean code come first—polish doesn’t mean much
              if the foundation is shaky. My goal is always the same: make it
              secure, keep it tested, and ensure it feels effortless for the
              person using it.
            </AboutCard>
          </Reveal>

          <Reveal className="md:col-span-2" delay={0}>
            <AboutCard
              small
              icon={<Cpu size={20} />}
              iconClass="bg-primary/10 text-primary"
              title="Tools & Stack"
            >
              I have deep roots in the .NET Core ecosystem for heavy lifting,
              but these days I’m often found in the NestJS and MongoDB world
              for backend work. On the frontend, I use React to build fast,
              responsive interfaces. I’m also a big fan of containerization to
              keep deployments simple and scalable.
            </AboutCard>
          </Reveal>

          <Reveal className="md:col-span-2" delay={100}>
            <AboutCard
              small
              icon={<Sun size={20} />}
              iconClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
              title="Outside of Code"
            >
              When I’m offline, football is my go-to escape—whether I’m
              playing or over-analyzing team tactics from the couch. I’m also
              a big movie buff and spend time volunteering with a local social
              club, helping organize sports and arts activities for the
              community.
            </AboutCard>
          </Reveal>

          <Reveal className="md:col-span-2" delay={200}>
            <AboutCard
              small
              icon={<Sparkles size={20} />}
              iconClass="bg-green-500/10 text-green-600 dark:text-green-400"
              title="Future Goals"
            >
              Right now, I’m focused on mastering high-scale architecture and
              security. I want to keep building systems that solve real-world
              problems and eventually start contributing more to the
              open-source projects I use every day.
            </AboutCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function AboutCard({
  icon,
  iconClass,
  title,
  children,
  small = false,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <Card className={`h-full ${small ? "p-6" : "p-8"}`}>
      <div className="mb-4 flex items-center gap-3">
        <div className={`rounded-lg p-2 ${iconClass}`}>{icon}</div>
        <h3
          className={`font-bold text-foreground ${small ? "text-lg" : "text-xl"}`}
        >
          {title}
        </h3>
      </div>
      <p className={`leading-relaxed text-muted ${small ? "text-sm" : ""}`}>
        {children}
      </p>
    </Card>
  );
}

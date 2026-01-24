import React from "react";
import SectionWrapper from "./SectionWrapper";
import { User, Code, Cpu, Sparkles, Sun } from "lucide-react";

const About: React.FC = () => {
  return (
    <SectionWrapper id="about" className="bg-black">
      <div className="mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          About <span className="text-primary">Me</span>
        </h2>
        <div className="h-1 w-20 bg-primary rounded-full shadow-[0_0_10px_#00d2ff]"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        {/* Top Row - 2 Large Cards */}
        <div className="md:col-span-3 bg-surface border border-white/10 rounded-xl p-8 hover:border-primary/50 transition-all duration-300 group">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all">
              <User size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">My Journey</h3>
          </div>
          <p className="text-gray-400 leading-relaxed">
            I started out in the .NET world, building the "engines" (APIs) that
            make apps run. Over time, I got curious about the full picture and
            moved into modern frontend frameworks. There's something really
            satisfying about taking a complex backend and turning it into a
            smooth, easy-to-use experience.
          </p>
        </div>

        <div className="md:col-span-3 bg-surface border border-white/10 rounded-xl p-8 hover:border-primary/50 transition-all duration-300 group">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-secondary/10 rounded-lg text-secondary group-hover:shadow-[0_0_15px_rgba(112,0,255,0.3)] transition-all">
              <Code size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">
              Development Philosophy
            </h3>
          </div>
          <p className="text-gray-400 leading-relaxed">
            I'm a "build it right" kind of developer. I believe solid
            architecture and clean code come first—polish doesn't mean much if
            the foundation is shaky. My goal is always the same: make it secure,
            keep it tested, and ensure it feels effortless for the person using
            it.
          </p>
        </div>

        {/* Bottom Row - 3 Smaller Cards */}
        <div className="md:col-span-2 bg-surface border border-white/10 rounded-xl p-6 hover:border-primary/50 transition-all duration-300 group">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Cpu size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">Tools & Stack</h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            I have deep roots in the .NET Core ecosystem for heavy lifting, but
            these days I'm often found in the NestJS and MongoDB world for
            backend work. On the frontend, I use React to build fast, responsive
            interfaces. I'm also a big fan of containerization to keep
            deployments simple and scalable.
          </p>
        </div>

        <div className="md:col-span-2 bg-surface border border-white/10 rounded-xl p-6 hover:border-primary/50 transition-all duration-300 group">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <Sun size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">Outside of Code</h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            When I'm offline, football is my go-to escape—whether I'm playing or
            over-analyzing team tactics from the couch. I'm also a big movie
            buff and spend time volunteering with a local social club, helping
            organize sports and arts activities for the community.
          </p>
        </div>

        <div className="md:col-span-2 bg-surface border border-white/10 rounded-xl p-6 hover:border-primary/50 transition-all duration-300 group">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
              <Sparkles size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">Future Goals</h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            Right now, I'm focused on mastering high-scale architecture and
            security. I want to keep building systems that solve real-world
            problems and eventually start contributing more to the open-source
            projects I use every day.
          </p>
        </div>
      </div>
    </SectionWrapper>
  );
};

export default About;

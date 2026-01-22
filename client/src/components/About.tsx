import React from "react";
import SectionWrapper from "./SectionWrapper";
import { User, Code, Cpu, Gamepad2, Sparkles } from "lucide-react";

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
            My evolution into software architecture started with a command line
            and a curiosity for how systems scale. Starting as a backend
            specialist in .NET, I expanded into the React ecosystem to control
            the full lifecycle of application delivery. There's a unique
            satisfaction in seeing a distributed microservice architecture
            render seamlessly into a fluid, interactive UI.
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
            I believe in 'form follows function' but 'aesthetics drive
            adoption'. My focus is on crafting resilient, self-healing
            architectures that feel effortless to the user. Clean code,
            comprehensive testing, and accessible design are the non-negotiable
            pillars of my workflow.
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
            I champion the .NET Core ecosystem for its type safety and
            performance. React 19 and Tailwind allow for rapid UI iteration,
            while Docker ensures my backends are as robust as they are scalable.
          </p>
        </div>

        <div className="md:col-span-2 bg-surface border border-white/10 rounded-xl p-6 hover:border-primary/50 transition-all duration-300 group">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <Gamepad2 size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">Outside of Code</h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            When the terminal is closed, I reset by competitive gaming (FPS/RTS)
            to keep my reflexes sharp, or analyzing game theory in football
            matches. These pursuits fuel my strategic thinking.
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
            I'm currently diving deep into WebAssembly to bring desktop-class
            performance to the browser. I also aim to contribute more to the
            open-source .NET community.
          </p>
        </div>
      </div>
    </SectionWrapper>
  );
};

export default About;

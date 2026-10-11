import React from "react";
import SectionWrapper from "./SectionWrapper";
import { EXPERIENCE } from "../constants";
import { Briefcase, Calendar } from "lucide-react";

const ExperienceTimeline: React.FC = () => {
  return (
    <SectionWrapper id="experience">
      <div className="mb-16 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Professional <span className="text-primary">Odyssey</span>
        </h2>
        <div className="h-1 w-20 bg-primary mx-auto rounded-full shadow-[0_0_10px_#00d2ff]"></div>
      </div>

      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 h-full w-px bg-linear-to-b from-transparent via-primary/50 to-transparent"></div>

        <div className="space-y-12">
          {EXPERIENCE.map((exp, index) => (
            <div
              key={exp.id}
              className={`relative flex flex-col md:flex-row items-center ${
                index % 2 === 0 ? "md:flex-row-reverse" : ""
              }`}
            >
              {/* Dot on Line */}
              <div className="absolute left-0 md:left-1/2 transform -translate-x-1/2 w-4 h-4 bg-black border-2 border-primary rounded-full z-10 shadow-[0_0_10px_#00d2ff] mt-6 md:mt-0"></div>

              {/* Content Card */}
              <div
                className={`w-full md:w-5/12 ml-8 md:ml-0 ${
                  index % 2 === 0
                    ? "md:pl-12 text-left"
                    : "md:pr-12 md:text-right"
                }`}
              >
                <div className="p-6 bg-surface border border-white/5 rounded-xl hover:border-primary/30 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/5">
                  <div
                    className={`flex items-center gap-2 text-primary font-mono text-sm mb-2 ${
                      index % 2 !== 0 && "md:justify-end"
                    }`}
                  >
                    <Calendar size={14} />
                    {exp.period}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors">
                    {exp.role}
                  </h3>

                  <div
                    className={`flex items-center gap-2 text-gray-400 mb-4 ${
                      index % 2 !== 0 && "md:justify-end"
                    }`}
                  >
                    <Briefcase size={14} />
                    {exp.company}
                  </div>

                  <ul
                    className={`space-y-2 text-gray-400 text-sm mb-4 list-disc list-inside ${
                      index % 2 !== 0 ? "md:list-none" : ""
                    }`}
                  >
                    {exp.description.map((desc, i) => (
                      <li key={i}>{desc}</li>
                    ))}
                  </ul>

                  <div
                    className={`flex flex-wrap gap-2 ${
                      index % 2 !== 0 && "md:justify-end"
                    }`}
                  >
                    {exp.tech.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-primary font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Empty Space for opposite side */}
              <div className="w-full md:w-5/12"></div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};

export default ExperienceTimeline;

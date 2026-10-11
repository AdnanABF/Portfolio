import React from "react";
import SectionWrapper from "./SectionWrapper";
import { SKILLS } from "../constants";
import { motion } from "framer-motion";

const SkillsGrid: React.FC = () => {
  const categories = Array.from(new Set(SKILLS.map((s) => s.category)));

  return (
    <SectionWrapper id="skills" className="bg-surface/30">
      <div className="mb-16 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Tech <span className="text-primary">Arsenal</span>
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          A hybrid skillset combining enterprise-grade robustness with modern
          agility.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {categories.map((category, catIndex) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: catIndex * 0.1 }}
            className="bg-black/40 p-6 rounded-2xl border border-white/5 backdrop-blur-sm"
          >
            <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-2">
              <span className="text-primary mr-2">/</span>
              {category}
            </h3>

            <div className="flex flex-wrap gap-4">
              {SKILLS.filter((s) => s.category === category).map((skill) => (
                <div key={skill.name} className="group relative">
                  {/* Hexagon Shape CSS Construction */}
                  <div className="w-24 h-28 relative flex items-center justify-center transition-transform transform group-hover:-translate-y-2">
                    <div
                      className="absolute inset-0 bg-surface border-2 border-white/10 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all duration-300"
                      style={{
                        clipPath:
                          "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                      }}
                    >
                      <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>

                    <div className="relative z-10 flex flex-col items-center gap-1">
                      <span className="text-2xl font-bold text-gray-500 group-hover:text-white transition-colors">
                        {skill.level}%
                      </span>
                      <span className="text-xs font-mono text-primary text-center px-2">
                        {skill.name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
};

export default SkillsGrid;

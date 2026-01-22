import React from "react";
import SectionWrapper from "./SectionWrapper";
import { PROJECTS } from "../constants";
import { ExternalLink, Github, Layers } from "lucide-react";
import { motion } from "framer-motion";

const Projects: React.FC = () => {
  return (
    <SectionWrapper id="projects">
      <div className="mb-16 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Featured <span className="text-primary">Deployments</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {PROJECTS.map((project) => (
          <motion.div
            key={project.id}
            whileHover={{ y: -10 }}
            className="group relative bg-surface border border-white/10 rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300"
          >
            {/* Image Overlay */}
            <div className="relative h-48 overflow-hidden">
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
              <img
                src={project.imageUrl}
                alt={project.title}
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
              />
            </div>

            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                  {project.title}
                </h3>
                <Layers
                  className="text-gray-600 group-hover:text-primary transition-colors"
                  size={20}
                />
              </div>

              <p className="text-gray-400 text-sm mb-6 leading-relaxed min-h-15">
                {project.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="text-xs font-mono px-2 py-1 bg-white/5 text-primary rounded border border-primary/20"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <Github size={16} /> Code
                  </a>
                )}
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-primary transition-colors ml-auto"
                  >
                    Live Demo <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
};

export default Projects;

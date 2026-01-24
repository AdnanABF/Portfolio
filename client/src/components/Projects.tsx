import React, { useState } from "react";
import SectionWrapper from "./SectionWrapper";
import { PROJECTS } from "../constants";
import { ExternalLink, Github, Layers, Lock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Projects: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const openRequestModal = (e: React.MouseEvent, projectTitle: string) => {
    e.preventDefault();
    setSelectedProject(projectTitle);
    setIsModalOpen(true);
  };

  const handleConfirmRequest = () => {
    if (!selectedProject) return;

    // Create a custom event to send the data to the Contact component
    const event = new CustomEvent("contact-autofill", {
      detail: {
        subject: `Request Access for ${selectedProject}`,
        message: `Hi Adnan, I'm interested in viewing the source code for "${selectedProject}". Could you please provide access to the repository?`,
      },
    });

    // Dispatch the event globally
    window.dispatchEvent(event);

    setIsModalOpen(false);

    // Scroll to the contact section
    const contactFormSection = document.getElementById("contact-form");
    contactFormSection?.scrollIntoView({ behavior: "smooth" });
  };

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
                    href={project.isPrivate ? "#" : project.githubUrl}
                    onClick={(e) =>
                      project.isPrivate
                        ? openRequestModal(e, project.title)
                        : null
                    }
                    target={project.isPrivate ? "_self" : "_blank"}
                    rel="noopener noreferrer"
                    title={
                      project.isPrivate
                        ? "Private Repository - Click to Request Access"
                        : "View Code"
                    }
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <Github size={16} /> Code
                    {project.isPrivate && (
                      <Lock size={12} className="text-primary" />
                    )}
                  </a>
                )}
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
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

      {/* Access Request Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-white/10 p-8 rounded-2xl max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Lock className="text-primary" size={24} />
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">
                Private Repository
              </h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                The source code for{" "}
                <span className="text-white font-semibold">
                  "{selectedProject}"
                </span>{" "}
                is currently private. Would you like to send a request to Adnan
                for repository access?
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirmRequest}
                  className="w-full py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-all"
                >
                  Yes, Send Request
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3 bg-white/5 text-white font-semibold rounded-lg hover:bg-white/10 transition-all border border-white/10"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SectionWrapper>
  );
};

export default Projects;

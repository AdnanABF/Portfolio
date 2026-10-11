import React, { type ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
  id: string;
  className?: string;
}

const SectionWrapper: React.FC<Props> = ({ children, id, className = "" }) => {
  return (
    <section
      id={id}
      className={`py-20 px-6 md:px-12 relative overflow-hidden ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 75, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{
          duration: 0.8,
          type: "spring",
          bounce: 0.3,
        }}
        className="max-w-7xl mx-auto"
      >
        {children}
      </motion.div>
    </section>
  );
};

export default SectionWrapper;

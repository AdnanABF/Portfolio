import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS } from "../constants";
import { motion, AnimatePresence } from "framer-motion";

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-md border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative">
        {/* Left: Name & Designation */}
        <a href="#" className="flex flex-col group z-20">
          <span className="font-bold text-lg md:text-xl tracking-tight text-white group-hover:text-primary transition-colors">
            Adnan Bin Farook
          </span>
          <span className="text-xs font-mono text-gray-400 tracking-wider group-hover:text-gray-300 transition-colors">
            Software Engineer
          </span>
        </a>

        {/* Center: Desktop Nav (Pill Layout) */}
        <div className="hidden md:flex items-center absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1.5 backdrop-blur-md shadow-lg shadow-black/20">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        {/* Right: Hire Me & Mobile Toggle */}
        <div className="flex items-center gap-4 z-20">
          <a
            href="#contact"
            className="hidden md:flex items-center gap-2 px-5 py-2 bg-primary text-black font-bold rounded-full text-sm hover:bg-primary/90 hover:shadow-[0_0_15px_rgba(0,210,255,0.4)] transition-all transform hover:-translate-y-0.5"
          >
            Hire Me
          </a>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-gray-300 hover:text-white p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-surface border-b border-white/10 overflow-hidden absolute w-full top-20 left-0 shadow-2xl"
          >
            <div className="flex flex-col p-6 gap-2">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="text-gray-300 hover:text-primary hover:bg-white/5 px-4 py-3 rounded-lg text-lg font-medium transition-all flex items-center justify-between group"
                >
                  {item.label}
                  <span className="opacity-0 group-hover:opacity-100 text-primary transition-opacity">
                    →
                  </span>
                </a>
              ))}
              <div className="h-px bg-white/10 my-2"></div>
              <a
                href="#contact"
                onClick={() => setIsOpen(false)}
                className="text-center py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-all"
              >
                Hire Me
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;

import React from "react";
import { Heart } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer className="py-8 bg-black border-t border-white/10 text-center">
      <div className="max-w-7xl mx-auto px-6">
        <p className="flex items-center justify-center gap-2 text-gray-500 text-sm font-mono">
          © {new Date().getFullYear()} Designed & Built with{" "}
          <Heart size={14} className="text-primary fill-primary" /> using React
          19 & Tailwind
        </p>
      </div>
    </footer>
  );
};

export default Footer;

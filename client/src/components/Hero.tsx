import React, { useEffect, useRef } from "react";
import {
  ArrowDown,
  Github,
  Linkedin,
  Mail,
  Download,
  Code2,
  Terminal,
} from "lucide-react";
import { motion } from "framer-motion";

const Hero: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Particle Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
    }[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      particles = [];
      const count = Math.floor(window.innerWidth / 15);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 0.5,
        });
      }
    };

    const draw = () => {
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#00d2ff";
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.globalAlpha =
          ((Math.sin(Date.now() * 0.001 + i) + 1) / 2) * 0.3 + 0.1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        particles.forEach((p2, j) => {
          if (i === j) return;
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.strokeStyle = `rgba(0, 210, 255, ${0.05 - dist / 2000})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    resizeCanvas();
    createParticles();
    draw();

    window.addEventListener("resize", () => {
      resizeCanvas();
      createParticles();
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-10 md:pt-20"
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-40" />

      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,210,255,0.03),transparent_70%)]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="mb-8 flex flex-col items-center"
        >
          {/* Profile Image with Cyber Gradient Ring */}
          <div className="relative w-40 h-40 mb-6 group">
            <div className="absolute inset-0 rounded-full bg-linear-to-br from-primary via-secondary to-primary blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse"></div>
            <div className="relative w-full h-full rounded-full p-0.75 bg-linear-to-br from-primary to-secondary shadow-lg shadow-primary/20">
              <div className="w-full h-full rounded-full overflow-hidden bg-surface relative">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=400&h=400&q=80"
                  alt="Adnan"
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            <Terminal size={14} className="text-primary" />
            <span className="text-sm font-mono text-gray-300">
              Hello, I'm Adnan
            </span>
          </motion.div>
        </motion.div>

        {/* Compact & Punchy Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight"
        >
          Architecting{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-secondary filter drop-shadow-[0_0_10px_rgba(0,210,255,0.3)]">
            Digital Excellence
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          A Senior Software Engineer bridging the gap between scalable{" "}
          <span className="text-white font-semibold">.NET ecosystems</span> and
          immersive{" "}
          <span className="text-white font-semibold">React interfaces</span>.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <a
            href="#"
            className="group px-8 py-3.5 bg-primary text-black font-bold rounded-full hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(0,210,255,0.4)] transition-all flex items-center gap-2 transform hover:-translate-y-1"
          >
            Download CV{" "}
            <Download
              size={18}
              className="group-hover:translate-y-1 transition-transform"
            />
          </a>
          <a
            href="#projects"
            className="px-8 py-3.5 bg-white/5 border border-white/10 text-white font-bold rounded-full hover:bg-white/10 hover:border-white/30 transition-all flex items-center gap-2"
          >
            <Code2 size={18} /> View Projects
          </a>
        </motion.div>

        {/* Social Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-6"
        >
          <SocialLink
            href="https://github.com/AdnanABF"
            icon={<Github size={20} />}
            label="Github"
          />
          <SocialLink
            href="https://www.linkedin.com/in/adnan-here/"
            icon={<Linkedin size={20} />}
            label="LinkedIn"
          />
          <SocialLink
            href="mailto:adnanabf@gmail.com"
            icon={<Mail size={20} />}
            label="Email"
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce"
      >
        <a
          href="#about"
          className="text-gray-500 hover:text-primary transition-colors"
        >
          <ArrowDown size={24} />
        </a>
      </motion.div>
    </section>
  );
};

const SocialLink: React.FC<{
  href: string;
  icon: React.ReactNode;
  label: string;
}> = ({ href, icon, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className="p-3 bg-surface border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-primary/50 hover:shadow-[0_0_15px_rgba(0,210,255,0.2)] transition-all hover:-translate-y-1"
  >
    {icon}
  </a>
);

export default Hero;

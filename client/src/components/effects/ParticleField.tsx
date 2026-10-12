"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

/**
 * Theme-aware particle network (ported from the v1 Hero canvas).
 * Light mode: faint warm-neutral dots; dark mode: cyan glow like v1.
 * Respects prefers-reduced-motion by rendering a single static frame.
 */
export function ParticleField({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const isDark = resolvedTheme === "dark";
    const dotColor = isDark ? "#00d2ff" : "#0e7490";
    const lineColor = isDark ? "0, 210, 255" : "14, 116, 144";

    let animationFrameId = 0;
    let particles: Particle[] = [];
    let isVisible = true;
    let isRunning = false;

    const resizeCanvas = () => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    const createParticles = () => {
      particles = [];
      const width = parent.clientWidth;
      const isMobile = width < 768;
      // Cap at 40 on mobile, 90 on desktop to preserve 60fps & reduce CPU
      const maxCount = isMobile ? 40 : 90;
      const divisor = isMobile ? 22 : 16;
      const count = Math.min(maxCount, Math.floor(width / divisor));

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

    const drawFrame = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.globalAlpha =
          ((Math.sin(time * 0.001 + i) + 1) / 2) * 0.3 + 0.1;
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        particles.forEach((p2, j) => {
          if (i === j) return;
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.strokeStyle = `rgba(${lineColor}, ${0.05 - dist / 1800})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });
      ctx.globalAlpha = 1;
    };

    resizeCanvas();
    createParticles();

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      drawFrame(0);
      return;
    }

    const startAnimation = () => {
      if (isRunning) return;
      isRunning = true;
      const loop = (time: number) => {
        if (!isVisible) {
          isRunning = false;
          return;
        }
        drawFrame(time);
        animationFrameId = requestAnimationFrame(loop);
      };
      animationFrameId = requestAnimationFrame(loop);
    };

    const stopAnimation = () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
    };

    // Pause when off-screen to save battery and rendering cycles
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          startAnimation();
        } else {
          stopAnimation();
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(canvas);

    const handleResize = () => {
      resizeCanvas();
      createParticles();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      stopAnimation();
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [resolvedTheme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 opacity-15 dark:opacity-40 ${className}`}
    />
  );
}

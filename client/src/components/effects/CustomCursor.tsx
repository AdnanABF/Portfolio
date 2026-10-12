"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

function useFinePointer() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia("(pointer: fine)");
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia("(pointer: fine)").matches,
    () => false,
  );
}

function useReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * Dual-layer cursor overlay (ported from v1, no animation library).
 * Desktop fine-pointers only, hidden with reduced motion.
 * The native cursor stays visible — this is a decorative accent.
 */
export function CustomCursor() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fine || reduced) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let x = -100;
    let y = -100;
    let ringX = -100;
    let ringY = -100;
    let scale = 1;
    let raf = 0;
    let isMoving = false;

    const render = () => {
      dot.style.transform = `translate(${x - 8}px, ${y - 8}px) scale(${scale})`;
      ring.style.transform = `translate(${ringX - 16}px, ${ringY - 16}px) scale(${scale})`;
    };

    const loop = () => {
      const dx = x - ringX;
      const dy = y - ringY;
      ringX += dx * 0.16;
      ringY += dy * 0.16;
      render();

      // If the ring is close enough to target (<0.1px difference), sleep loop to save CPU
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        ringX = x;
        ringY = y;
        render();
        isMoving = false;
        return;
      }

      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      const target = e.target as HTMLElement | null;
      scale = target?.closest("a, button, [role='button']") ? 1.6 : 1;

      if (!isMoving) {
        isMoving = true;
        raf = requestAnimationFrame(loop);
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, [fine, reduced]);

  if (!fine || reduced) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9998] hidden md:block">
      <div
        ref={dotRef}
        className="absolute top-0 left-0 h-4 w-4 rounded-full bg-primary/80"
      />
      <div
        ref={ringRef}
        className="absolute top-0 left-0 h-8 w-8 rounded-full border border-primary/60"
      />
    </div>
  );
}

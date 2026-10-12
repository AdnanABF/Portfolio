"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LinkButton } from "@/components/ui/Button";
import { NAV_ITEMS } from "@/lib/data";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-line bg-background/80 backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <div className="relative mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        {/* Left: Name & Designation */}
        <Link href="/" className="group z-20 flex flex-col">
          <span className="text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary md:text-xl">
            Adnan Bin Farook
          </span>
          <span className="font-mono text-xs tracking-wider text-muted transition-colors group-hover:text-foreground">
            Software Engineer
          </span>
        </Link>

        {/* Center: Desktop Nav (Pill Layout) */}
        <div className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center md:flex">
          <div className="flex items-center gap-1 rounded-full border-2 border-line bg-surface/90 p-1.5 shadow-[3px_3px_0px_var(--shadow-color)] backdrop-blur-md">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted transition-all hover:bg-cream hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Hire Me + Theme + Mobile Toggle */}
        <div className="z-20 flex items-center gap-3">
          <LinkButton href="/#contact" className="px-5 py-2 max-md:hidden">
            Hire Me
          </LinkButton>
          <ThemeToggle />

          <button
            type="button"
            className="rounded-lg p-2 text-muted transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary md:hidden"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation-menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <div
        id="mobile-navigation-menu"
        className={`absolute top-20 left-0 w-full overflow-hidden border-b border-line bg-surface shadow-2xl transition-all duration-300 md:hidden ${
          isOpen ? "max-h-[480px] opacity-100" : "max-h-0 border-b-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-2 p-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="group flex items-center justify-between rounded-lg px-4 py-3 text-lg font-medium text-muted transition-all hover:bg-cream hover:text-primary"
            >
              {item.label}
              <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">
                →
              </span>
            </Link>
          ))}
          <div className="my-2 h-px bg-line"></div>
          <Link
            href="/#contact"
            onClick={() => setIsOpen(false)}
            className="rounded-lg bg-primary py-3 text-center font-bold text-white transition-all hover:bg-primary-strong dark:text-black"
          >
            Hire Me
          </Link>
        </div>
      </div>
    </nav>
  );
}

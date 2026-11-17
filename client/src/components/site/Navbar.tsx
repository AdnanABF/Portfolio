"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/site/UserMenu";
import { LinkButton } from "@/components/ui/Button";
import { useSiteContent } from "@/components/site/SiteContentProvider";

/** Links shown directly in the desktop bar; the rest sit under "More" so the bar never gets crowded. */
const DESKTOP_LINKS = 4;

export function Navbar() {
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const { profile, sections } = useSiteContent();

  // The links come straight from the home page content (the same list that orders the page), so they never
  // depend on any other request and cannot disappear because one failed.
  const navItems = sections.filter((s) => s.enabled).map((s) => ({ id: s.id, label: s.label, href: `/#${s.id}` }));
  // The "Hire Me" button already leads to the contact section, so the desktop bar leaves that link out.
  const barItems = navItems.filter((item) => item.id !== "contact");
  const shown = barItems.length > DESKTOP_LINKS + 1 ? barItems.slice(0, DESKTOP_LINKS) : barItems;
  const more = barItems.slice(shown.length);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  // A tap outside the navbar or Escape closes the mobile menu, like the other menus on the site.
  useEffect(() => {
    if (!isOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Focus on a menu link would be left on an element that is now hidden, so it goes back to the menu button.
      if (navRef.current?.querySelector("#mobile-navigation-menu")?.contains(document.activeElement)) toggleRef.current?.focus();
      setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      ref={navRef}
      // The navbar lives in the root layout and is never unmounted, so a link or button anywhere in it (the logo, the
      // sign-in or account menu) closes the mobile menu too; otherwise it would stay open on the next page.
      onClickCapture={(e) => {
        const target = e.target as Element;
        if (!toggleRef.current?.contains(target) && target.closest("a, button")) setIsOpen(false);
      }}
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-line bg-background/80 backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <div className="relative mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        {/* Left: Brand Logo & Name */}
        <Link href="/" className="group z-20 flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-line bg-surface p-1 shadow-[2.5px_2.5px_0px_var(--shadow-color)] transition-all duration-150 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-[4px_4px_0px_var(--shadow-color)]">
            <Image
              src="/abf_logo.png"
              alt={`${profile.name} logo`}
              width={36}
              height={36}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary md:text-xl">
              {profile.name}
            </span>
            <span className="font-mono text-xs tracking-wider text-muted transition-colors group-hover:text-foreground">
              {profile.role}
            </span>
          </div>
        </Link>

        {/* Center: Desktop Nav (Pill Layout) */}
        <div className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center lg:flex">
          <div className="flex items-center gap-1 rounded-full border-2 border-line bg-surface/90 p-1.5 shadow-[3px_3px_0px_var(--shadow-color)] backdrop-blur-md">
            {shown.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted transition-all hover:bg-cream hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            {more.length > 0 ? (
              <div ref={moreRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                  aria-haspopup="true"
                  className="flex cursor-pointer items-center gap-1 rounded-full px-4 py-1.5 text-sm font-semibold text-muted transition-all hover:bg-cream hover:text-foreground"
                >
                  More
                  <ChevronDown size={14} className={`transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {moreOpen ? (
                  <div className="absolute top-full right-0 mt-3 min-w-44 rounded-2xl border-2 border-line bg-surface p-1.5 shadow-[3px_3px_0px_var(--shadow-color)]">
                    {more.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className="block rounded-xl px-4 py-2 text-sm font-semibold text-muted transition-all hover:bg-cream hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right: Hire Me + Theme + Mobile Toggle */}
        <div className="z-20 flex items-center gap-3">
          <LinkButton href="/#contact" className="px-5 py-2 max-lg:hidden">
            {profile.hireMeLabel}
          </LinkButton>
          <ThemeToggle />
          <UserMenu />

          <button
            ref={toggleRef}
            type="button"
            className="rounded-lg p-2 text-muted transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary lg:hidden"
            onClick={() => setIsOpen((open) => !open)}
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation-menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav. Closed, it is `invisible` (visibility: hidden) as well as transparent and zero-height: opacity
          alone leaves the links on top of the page, where they catch taps meant for it and take keyboard focus.
          Visibility switches after the fade-out, so the closing animation still plays. */}
      <div
        id="mobile-navigation-menu"
        className={`absolute top-20 left-0 w-full border-b border-line bg-surface shadow-2xl transition-all duration-300 lg:hidden ${
          isOpen ? "visible max-h-[calc(100dvh-5rem)] overflow-y-auto opacity-100" : "invisible max-h-0 overflow-hidden border-b-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-2 p-6">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
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
            className="rounded-lg bg-primary py-3 text-center font-bold text-white transition-all hover:bg-primary-strong dark:text-black"
          >
            {profile.hireMeLabel}
          </Link>
        </div>
      </div>
    </nav>
  );
}

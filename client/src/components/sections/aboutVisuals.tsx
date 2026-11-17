import {
  BookOpen, Briefcase, Code, Coffee, Cpu, Globe, Heart, Rocket, Shield, Sparkles, Sun, User,
  type LucideIcon,
} from "lucide-react";
import type { AboutColor, AboutIcon } from "@/lib/homepage";

/** The icons an About card can use. The names are the ones the API accepts. */
export const ABOUT_ICON_COMPONENTS: Record<AboutIcon, LucideIcon> = {
  user: User,
  code: Code,
  cpu: Cpu,
  sun: Sun,
  sparkles: Sparkles,
  heart: Heart,
  book: BookOpen,
  rocket: Rocket,
  globe: Globe,
  briefcase: Briefcase,
  shield: Shield,
  coffee: Coffee,
};

/** Tailwind classes for the icon badge of each colour. Written out in full so Tailwind finds them. */
export const ABOUT_COLOR_CLASSES: Record<AboutColor, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  green: "bg-green-500/10 text-green-600 dark:text-green-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  coral: "bg-accent-coral/10 text-accent-coral",
};

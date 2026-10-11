import type {
  ExperienceItem,
  NavItem,
  PostItem,
  ProjectItem,
  Skill,
} from "./types";

export const NAV_ITEMS: NavItem[] = [
  { label: "About", href: "/#about" },
  { label: "Experience", href: "/#experience" },
  { label: "Skills", href: "/#skills" },
  { label: "Projects", href: "/#projects" },
  { label: "Contact", href: "/#contact" },
];

export const SKILLS: Skill[] = [
  // Microsoft
  { name: "C#", category: "Microsoft", level: 90 },
  { name: ".NET Core", category: "Microsoft", level: 88 },
  { name: "ASP .NET Core MVC", category: "Microsoft", level: 85 },
  { name: ".NET Core Web API", category: "Microsoft", level: 85 },
  { name: "MSSQL", category: "Microsoft", level: 85 },
  // Modern
  { name: "React", category: "Modern", level: 70 },
  { name: "Node.js", category: "Modern", level: 60 },
  { name: "NestJS", category: "Modern", level: 60 },
  { name: "MongoDB", category: "Modern", level: 60 },
  { name: "TypeScript", category: "Modern", level: 60 },
  // Legacy
  { name: "AngularJS", category: "Legacy", level: 75 },
  { name: "KnockoutJS", category: "Legacy", level: 80 },
  // Tools
  { name: "Azure Devops", category: "Tools", level: 80 },
  { name: "Azure Storage Explorer", category: "Tools", level: 75 },
  { name: "VS & VS Code", category: "Tools", level: 80 },
  { name: "SSMS", category: "Tools", level: 70 },
  { name: "Git", category: "Tools", level: 90 },
];

export const EXPERIENCE: ExperienceItem[] = [
  {
    id: "1",
    role: "Senior Software Engineer",
    company: "RM Education Solutions India Pvt Ltd",
    period: "October 2024 - December 2025",
    description: [
      "Built scalable ASP.NET MVC applications using clean architecture and SOLID principles.",
      "Developed responsive UIs, secure APIs, and SSO-based identity solutions for enterprise systems.",
      "Implemented Azure serverless workflows and optimized performance using Redis Cache.",
      "Managed cloud resources, monitoring, and CI/CD pipelines in Agile delivery environments.",
    ],
    tech: [
      ".NET",
      "ASP .NET MVC",
      "C#",
      "Azure",
      "MSSQL",
      "KnockoutJs",
      "Azure Functions",
    ],
  },
  {
    id: "2",
    role: "Software Developer",
    company: "Skien Software Lab",
    period: "August 2022 - December 2023",
    description: [
      "Built and maintained scalable full-stack web applications, delivering production-ready features end-to-end.",
      "Designed and optimized databases, REST APIs, and third-party integrations, improving performance by ~35%.",
      "Contributed across the full SDLC, reducing feature delivery time by ~25%.",
      "Collaborated with cross-functional teams to deliver stable, high-quality software with minimal defects.",
      "Authored technical documentation, improving onboarding and knowledge transfer by ~40%.",
    ],
    tech: [
      ".NET Core",
      "ASP .NET Core MVC",
      "C#",
      "MSSQL",
      "AngularJS",
      "Mobile App Development",
    ],
  },
];

export const PROJECTS: ProjectItem[] = [
  {
    id: "p1",
    slug: "viralippurath-family",
    title: "Viralippurath Family",
    description:
      "A private, full-stack platform built to keep my family organized and connected. It replaces messy group chats with a dedicated space for shared schedules, announcements, and task tracking.",
    techStack: [
      "React",
      "NestJs",
      "MongoDB",
      "Tailwind CSS",
      "Coolify",
      "Cloudinary",
    ],
    githubUrl: "https://github.com/AdnanABF/Viralippurath-Family",
    isPrivate: true,
    liveUrl: "https://www.viralippurath.com/",
    imageUrl: "/viralippurath_family.png",
  },
  {
    id: "p2",
    slug: "gramahub",
    title: "GramaHub",
    description:
      "A platform for managing and sharing local community information, events, and managing family and members.",
    techStack: ["React", "NestJs", "MongoDB", "Tailwind CSS", "Coolify"],
    githubUrl: "https://github.com/AdnanABF/GramaHub",
    isPrivate: true,
    imageUrl: "/og-image.png",
  },
  {
    id: "p3",
    slug: "vacabook",
    title: "VacaBook",
    description:
      "A full-stack web application for managing vacation rentals, featuring secure payment processing and real-time availability tracking.",
    techStack: [
      "C#",
      "ASP .NET Core MVC",
      "MSSQL",
      "Stripe API",
      "Apex Charts",
    ],
    githubUrl: "https://github.com/AdnanABF/VacaBook",
    imageUrl: "/og-image.png",
  },
];

/**
 * Blog posts — metadata lives here (listings, sitemap, api-client);
 * bodies live in content/blog/*.mdx and are mapped in lib/posts.ts.
 * Keep title/excerpt/publishedAt in sync with the MDX `metadata` export.
 */
export const POSTS: PostItem[] = [
  {
    slug: "building-this-site",
    title: "How this site is built",
    excerpt:
      "Next.js App Router on a light-first theme, MDX for writing, and Docker on Coolify instead of Vercel — the full stack behind this portfolio.",
    publishedAt: "2026-10-11",
  },
  {
    slug: "hello-world",
    title: "Hello, blog",
    excerpt:
      "Why this portfolio has a blog, and what I plan to write about: .NET modernization, React, and shipping on a self-hosted stack.",
    publishedAt: "2026-10-11",
  },
];

export function getProjectBySlug(slug: string): ProjectItem | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

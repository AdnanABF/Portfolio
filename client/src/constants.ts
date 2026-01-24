import type { ExperienceItem, ProjectItem, Skill, NavItem } from "./types";

export const NAV_ITEMS: NavItem[] = [
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Skills", href: "#skills" },
  { label: "Projects", href: "#projects" },
  { label: "Contact", href: "#contact" },
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
    title: "Viralippurath Family",
    description:
      "A private, full-stack platform built to keep my family organized and connected. It replaces messy group chats with a dedicated space for shared schedules, announcements, and task tracking.",
    techStack: [
      "React",
      "NestJs",
      "MongoDB",
      "Tailwind CSS",
      "Vercel",
      "Cloudinary",
    ],
    githubUrl: "https://github.com/AdnanABF/Viralippurath-Family",
    isPrivate: true,
    liveUrl: "https://viralippurath-family.vercel.app/",
    imageUrl: "/viralippurath_family.png",
  },
  {
    id: "p2",
    title: "E-Commerce Microservices",
    description:
      "Scalable backend architecture for high-volume retail, utilizing NestJS and MongoDB with Docker orchestration.",
    techStack: ["NestJS", "MongoDB", "Docker", "Azure"],
    githubUrl: "https://github.com",
    imageUrl: "https://picsum.photos/600/400?random=2",
  },
  {
    id: "p3",
    title: "Legacy CRM Migrator",
    description:
      "Internal tool to automate data migration from legacy SQL systems to modern NoSQL cloud databases.",
    techStack: ["C#", "WPF", "MSSQL", "MongoDB"],
    githubUrl: "https://github.com",
    liveUrl: "https://example.com",
    imageUrl: "https://picsum.photos/600/400?random=3",
  },
];

export interface Skill {
  id?: string;
  name: string;
  category: "Modern" | "Microsoft" | "Legacy" | "Tools";
  level: number; // 0-100
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  period: string;
  description: string[];
  tech: string[];
}

export interface ProjectItem {
  id: string;
  /** URL key for /projects/[slug] */
  slug: string;
  title: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  liveUrl?: string;
  imageUrl: string;
  isPrivate?: boolean;
}

export interface PostItem {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
}

export interface NavItem {
  label: string;
  href: string;
}

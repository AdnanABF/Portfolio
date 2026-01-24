export interface Skill {
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
  title: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  liveUrl?: string;
  imageUrl: string;
  isPrivate?: boolean;
}

export interface NavItem {
  label: string;
  href: string;
}

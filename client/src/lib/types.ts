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
  isPublished?: boolean;
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

// ---- Admin inbox ----------------------------------------------------------

/** unread, read, replied or archived. Replied implies read; archived is hidden from the default view. */
export type InquiryStatus = "unread" | "read" | "replied" | "archived";

/** "contact" for a normal message, "repo_request" for a request for access to a private repository. */
export type InquiryType = "contact" | "repo_request";

export interface InquiryItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: InquiryStatus;
  type: InquiryType;
  projectId?: string | null;
  projectTitle?: string | null;
  projectSlug?: string | null;
  createdAt: string;
}

export interface InquiryPage {
  items: InquiryItem[];
  /** Messages matching the filters, across all pages. */
  totalCount: number;
  page: number;
  pageSize: number;
  /** All unread messages, whatever the filters are. */
  unreadCount: number;
}

export interface InquiryQuery {
  search?: string;
  /** Empty means everything except archived. */
  status?: string;
  type?: string;
  /** ISO instants: from is inclusive, to is exclusive. */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

import type { CertificationItem, EducationItem, ExperienceItem, ProjectItem, Skill } from "./types";

// The editable home page content, as the API sends it. Keep the choice lists in step with
// HomepageContentRules in the API (server/Portfolio.API/Features/Homepage/HomepageContent.cs).

export const SECTION_IDS = ["about", "experience", "education", "skills", "projects", "certifications", "contact"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const LINK_KINDS = ["github", "linkedin", "email", "website", "phone", "other"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export const ABOUT_ICONS = [
  "user", "code", "cpu", "sun", "sparkles", "heart", "book", "rocket", "globe", "briefcase", "shield", "coffee",
] as const;
export type AboutIcon = (typeof ABOUT_ICONS)[number];

export const ABOUT_COLORS = ["primary", "secondary", "amber", "green", "sky", "coral"] as const;
export type AboutColor = (typeof ABOUT_COLORS)[number];

export const ABOUT_SIZES = ["large", "small"] as const;
export type AboutSize = (typeof ABOUT_SIZES)[number];

export const LIMITS = { links: 12, coreStack: 20, aboutCards: 12 } as const;

export interface ProfileContent {
  name: string;
  role: string;
  greeting: string;
  headline: string;
  headlineHighlight: string;
  subtitle: string;
  photoUrl: string;
  photoAlt: string;
  cvUrl: string;
  cvButtonLabel: string;
  projectsButtonLabel: string;
  hireMeLabel: string;
}

export interface AvailabilityContent {
  enabled: boolean;
  label: string;
  text: string;
}

export interface LocationContent {
  title: string;
  address: string;
  timeZone: string;
}

export interface LinkItem {
  id: string;
  label: string;
  url: string;
  kind: LinkKind;
  showInHero: boolean;
}

export interface AboutCard {
  id: string;
  title: string;
  text: string;
  icon: AboutIcon;
  color: AboutColor;
  size: AboutSize;
}

export interface AboutContent {
  cards: AboutCard[];
}

export interface ContactContent {
  text: string;
}

export interface SectionItem {
  id: SectionId;
  /** The name in the navigation bar. */
  label: string;
  /** Off hides both the section and its navigation link. */
  enabled: boolean;
  /** The section's heading: a small line above, the title with an accent-coloured part, and a description. */
  eyebrow: string;
  title: string;
  titleHighlight: string;
  description: string;
}

export interface SeoContent {
  title: string;
  description: string;
}

export interface HomepageContent {
  profile: ProfileContent;
  availability: AvailabilityContent;
  location: LocationContent;
  links: LinkItem[];
  coreStack: string[];
  about: AboutContent;
  contact: ContactContent;
  sections: SectionItem[];
  seo: SeoContent;
}

/** The lists the home page sections show. They are loaded on the server with the content, so the page arrives complete. */
export interface HomepageLists {
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: Skill[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
}

export const EMPTY_LISTS: HomepageLists = { experience: [], education: [], skills: [], projects: [], certifications: [] };

/** What the admin hub loads: the draft being edited and where it stands against the published page. */
export interface HomepageAdminState {
  draft: HomepageContent;
  hasUnpublishedChanges: boolean;
  draftUpdatedAt: string;
  draftUpdatedBy?: string | null;
  publishedAt: string;
}

/**
 * Shown only when the API cannot be reached, so the page still has a name, the navigation and sensible
 * labels instead of going blank. It is not the real content: the API seeds that from the owner's CV.
 */
export const FALLBACK_CONTENT: HomepageContent = {
  profile: {
    name: "Adnan Bin Farook",
    role: "Software Engineer",
    greeting: "Hello, I'm Adnan",
    headline: "Architecting",
    headlineHighlight: "Digital Excellence",
    subtitle: "A software engineer building secure, maintainable web applications.",
    photoUrl: "/adnan_photo.webp",
    photoAlt: "Adnan Bin Farook",
    cvUrl: "",
    cvButtonLabel: "Download CV",
    projectsButtonLabel: "View Projects",
    hireMeLabel: "Hire Me",
  },
  availability: { enabled: true, label: "Available for work", text: "Open to freelance projects and full-time opportunities." },
  location: { title: "", address: "", timeZone: "" },
  links: [],
  coreStack: [],
  about: { cards: [] },
  contact: { text: "" },
  sections: [
    { id: "about", label: "About", enabled: true, eyebrow: "// profile", title: "About", titleHighlight: "Me", description: "" },
    { id: "experience", label: "Experience", enabled: true, eyebrow: "// career", title: "Professional", titleHighlight: "Odyssey", description: "" },
    { id: "education", label: "Education", enabled: true, eyebrow: "// learning", title: "Academic", titleHighlight: "Background", description: "" },
    { id: "skills", label: "Skills", enabled: true, eyebrow: "// arsenal", title: "Tech", titleHighlight: "Arsenal", description: "" },
    { id: "projects", label: "Projects", enabled: true, eyebrow: "// work", title: "Featured", titleHighlight: "Deployments", description: "" },
    { id: "certifications", label: "Certifications", enabled: true, eyebrow: "// credentials", title: "Certifications", titleHighlight: "& Courses", description: "" },
    { id: "contact", label: "Contact", enabled: true, eyebrow: "", title: "Let's", titleHighlight: "Connect", description: "" },
  ],
  seo: {
    title: "Adnan Bin Farook | Software Engineer",
    description: "Portfolio of Adnan Bin Farook, a software engineer.",
  },
};

/** A list of sections from an older response or document gets any section it does not know yet, in its usual place. */
function withAllSections(sections: SectionItem[] | undefined): SectionItem[] {
  const list = sections && sections.length > 0 ? [...sections] : [];
  FALLBACK_CONTENT.sections.forEach((fallback, index) => {
    if (!list.some((s) => s.id === fallback.id)) list.splice(Math.min(index, list.length), 0, fallback);
  });
  return list;
}

/** Fills anything missing in a response with the fallback, so an older API response can never crash a component. */
export function normalizeContent(raw: Partial<HomepageContent> | null | undefined): HomepageContent {
  const c = raw ?? {};
  return {
    profile: { ...FALLBACK_CONTENT.profile, ...c.profile },
    availability: { ...FALLBACK_CONTENT.availability, ...c.availability },
    location: { ...FALLBACK_CONTENT.location, ...c.location },
    links: c.links ?? [],
    coreStack: c.coreStack ?? [],
    about: { cards: c.about?.cards ?? [] },
    contact: { ...FALLBACK_CONTENT.contact, ...c.contact },
    sections: withAllSections(c.sections),
    seo: { ...FALLBACK_CONTENT.seo, ...c.seo },
  };
}

/** The address of the first link of a kind, for places that need "the email" or "the GitHub". */
export function findLink(content: HomepageContent, kind: LinkKind): LinkItem | undefined {
  return content.links.find((l) => l.kind === kind);
}

/** The heading settings of one section, with safe empty defaults. */
export function sectionOf(content: HomepageContent, id: SectionId): SectionItem {
  return (
    content.sections.find((s) => s.id === id) ?? {
      id, label: id, enabled: true, eyebrow: "", title: "", titleHighlight: "", description: "",
    }
  );
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "")
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

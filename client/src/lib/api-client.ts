import { EXPERIENCE, POSTS, PROJECTS, SKILLS, getProjectBySlug } from "./data";
import type { ExperienceItem, PostItem, ProjectItem, Skill } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

// ==========================================
// Public Content Methods (with graceful fallback)
// ==========================================

interface ApiProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  tags?: string[];
  githubUrl?: string;
  liveUrl?: string;
  heroImageUrl?: string;
}

interface ApiPost {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt?: string;
}

interface ApiExperience {
  id: string;
  role: string;
  company: string;
  period: string;
  achievements?: string[];
}

interface ApiSkill {
  id?: string;
  name: string;
  category: string;
}

export async function getProjects(): Promise<ProjectItem[]> {
  if (!API_BASE) return PROJECTS;
  try {
    const res = await fetch(`${API_BASE}/api/projects`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return PROJECTS;
    const data: ApiProject[] = await res.json();
    return data.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      techStack: p.tags || [],
      githubUrl: p.githubUrl,
      liveUrl: p.liveUrl,
      imageUrl: p.heroImageUrl || "/og-image.png",
      isPrivate: !p.liveUrl,
    }));
  } catch {
    return PROJECTS;
  }
}

export async function getProject(slug: string): Promise<ProjectItem | undefined> {
  if (!API_BASE) return getProjectBySlug(slug);
  try {
    const res = await fetch(`${API_BASE}/api/projects/${slug}`, {
      next: { revalidate: 60 },
    });
    if (res.status === 404) return undefined;
    if (!res.ok) return getProjectBySlug(slug);
    const p: ApiProject = await res.json();
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      techStack: p.tags || [],
      githubUrl: p.githubUrl,
      liveUrl: p.liveUrl,
      imageUrl: p.heroImageUrl || "/og-image.png",
      isPrivate: !p.liveUrl,
    };
  } catch {
    return getProjectBySlug(slug);
  }
}

export async function getPosts(): Promise<PostItem[]> {
  if (!API_BASE) return POSTS;
  try {
    const res = await fetch(`${API_BASE}/api/blog`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return POSTS;
    const data: ApiPost[] = await res.json();
    return data.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      publishedAt: p.publishedAt ? p.publishedAt.split("T")[0] : "",
    }));
  } catch {
    return POSTS;
  }
}

export async function getExperience(): Promise<ExperienceItem[]> {
  if (!API_BASE) return EXPERIENCE;
  try {
    const res = await fetch(`${API_BASE}/api/experience`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return EXPERIENCE;
    const data: ApiExperience[] = await res.json();
    return data.map((e) => ({
      id: e.id,
      role: e.role,
      company: e.company,
      period: e.period,
      description: e.achievements || [],
      tech: [],
    }));
  } catch {
    return EXPERIENCE;
  }
}

export async function getSkills(): Promise<Skill[]> {
  if (!API_BASE) return SKILLS;
  try {
    const res = await fetch(`${API_BASE}/api/skills`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return SKILLS;
    const data: ApiSkill[] = await res.json();
    return data.map((s) => {
      const validCategories: Array<"Modern" | "Microsoft" | "Legacy" | "Tools"> = [
        "Modern",
        "Microsoft",
        "Legacy",
        "Tools",
      ];
      const category = validCategories.find(
        (c) => c.toLowerCase() === s.category.toLowerCase()
      ) || "Modern";

      return {
        id: s.id,
        name: s.name,
        category,
        level: 80,
      };
    });
  } catch {
    return SKILLS;
  }
}

export async function getSettings(): Promise<Record<string, string>> {
  if (!API_BASE) return {};
  try {
    const res = await fetch(`${API_BASE}/api/settings`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export async function getHealth(): Promise<{ status: string; dbLatencyMs: number; uptimeSeconds: number } | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ==========================================
// Telemetry & Contact
// ==========================================

export async function trackVisit(path: string, referrer?: string): Promise<void> {
  if (!API_BASE) return;
  try {
    await fetch(`${API_BASE}/api/telemetry/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, referrer }),
    });
  } catch {
    // Silent fail
  }
}

export async function trackCvDownload(referrer?: string): Promise<void> {
  if (!API_BASE) return;
  try {
    await fetch(`${API_BASE}/api/telemetry/cv-download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrer }),
    });
  } catch {
    // Silent fail
  }
}

export async function submitContact(data: { name: string; email: string; subject: string; message: string }) {
  const url = API_BASE ? `${API_BASE}/api/contact` : "/api/contact";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to submit inquiry.");
  return await res.json();
}

// ==========================================
// Admin & Mutation API
// ==========================================

function resolveUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(resolveUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Too many login attempts. Please wait 15 minutes before trying again.");
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Login failed.");
  }
  return await res.json();
}

export async function apiLogout() {
  const res = await fetch(resolveUrl("/api/auth/logout"), {
    method: "POST",
    credentials: "include",
  });
  return res.ok;
}

export async function getMe() {
  const res = await fetch(resolveUrl("/api/auth/me"), {
    credentials: "include",
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function updateProject(id: string, dto: Record<string, unknown>) {
  const res = await fetch(resolveUrl(`/api/projects/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to update project.");
  return await res.json();
}

export async function updateSetting(key: string, value: string) {
  const res = await fetch(resolveUrl(`/api/settings/${key}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`Failed to update setting ${key}.`);
  return await res.json();
}

export async function updateExperience(id: string, dto: Record<string, unknown>) {
  const res = await fetch(resolveUrl(`/api/experience/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to update experience.");
  return await res.json();
}

export async function createSkill(dto: { name: string; category: string; iconName?: string; sortOrder?: number }) {
  const res = await fetch(resolveUrl("/api/skills"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to create skill.");
  return await res.json();
}

export async function updateSkill(id: string, dto: { name: string; category: string; iconName?: string; sortOrder?: number }) {
  const res = await fetch(resolveUrl(`/api/skills/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to update skill.");
  return await res.json();
}

export async function deleteSkill(id: string) {
  const res = await fetch(resolveUrl(`/api/skills/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete skill.");
  return true;
}

export async function getPresignedUpload(fileName: string, contentType: string, folder: string) {
  const res = await fetch(resolveUrl("/api/media/presign"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ fileName, contentType, folder }),
  });
  if (!res.ok) throw new Error("Failed to generate upload URL.");
  return await res.json();
}

export async function getAdminSessions() {
  const res = await fetch(resolveUrl("/api/admin/sessions"), {
    credentials: "include",
  });
  if (!res.ok) return [];
  return await res.json();
}

export async function revokeSession(id: string) {
  const res = await fetch(resolveUrl(`/api/admin/sessions/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to revoke session.");
  return await res.json();
}

export async function getAdminActivity() {
  const res = await fetch(resolveUrl("/api/admin/activity"), {
    credentials: "include",
  });
  if (!res.ok) return [];
  return await res.json();
}

export async function getAdminSystemLogs() {
  const res = await fetch(resolveUrl("/api/admin/system-logs"), {
    credentials: "include",
  });
  if (!res.ok) return [];
  return await res.json();
}

export async function getAdminAnalytics() {
  const res = await fetch(resolveUrl("/api/telemetry/summary"), {
    credentials: "include",
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function getAdminInquiries() {
  const res = await fetch(resolveUrl("/api/contact/inquiries"), {
    credentials: "include",
  });
  if (!res.ok) return [];
  return await res.json();
}

export async function updateInquiryStatus(id: string, status: string) {
  const res = await fetch(resolveUrl(`/api/contact/inquiries/${id}/status`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(status),
  });
  if (!res.ok) throw new Error("Failed to update inquiry status.");
  return await res.json();
}

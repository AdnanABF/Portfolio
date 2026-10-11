import { POSTS, PROJECTS, getProjectBySlug } from "./data";
import type { PostItem, ProjectItem } from "./types";

/**
 * Backend boundary (see server/README.md).
 *
 * When `NEXT_PUBLIC_API_URL` is set (future Coolify `server/` service),
 * these functions call the remote API. Otherwise they fall back to the
 * local `lib/data.ts` content / internal Server Actions (Step 10).
 *
 * Components must import through here — never from `../server`
 * or `_reference-vite`.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export async function getProjects(): Promise<ProjectItem[]> {
  if (!API_BASE) return PROJECTS;
  const res = await fetch(`${API_BASE}/api/projects`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`GET /api/projects failed: ${res.status}`);
  return (await res.json()) as ProjectItem[];
}

export async function getProject(slug: string): Promise<ProjectItem | undefined> {
  if (!API_BASE) return getProjectBySlug(slug);
  const res = await fetch(`${API_BASE}/api/projects/${slug}`, {
    next: { revalidate: 3600 },
  });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`GET /api/projects/${slug} failed: ${res.status}`);
  return (await res.json()) as ProjectItem;
}

export async function getPosts(): Promise<PostItem[]> {
  if (!API_BASE) return POSTS;
  const res = await fetch(`${API_BASE}/api/posts`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`GET /api/posts failed: ${res.status}`);
  return (await res.json()) as PostItem[];
}

export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/** Used by Step 10's Server Action once the remote API exists. */
export function contactEndpoint(): string {
  return API_BASE ? `${API_BASE}/api/contact` : "/api/contact";
}

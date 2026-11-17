import { cacheLife, cacheTag } from "next/cache";
import { apiOrigin } from "./api-origin";
import {
  mapCertifications, mapEducation, mapExperience, mapProjects, mapSkills,
  type ApiCertification, type ApiEducation, type ApiExperience, type ApiProject, type ApiSkill,
} from "./api-client";
import { FALLBACK_CONTENT, normalizeContent, type HomepageContent, type HomepageLists } from "./homepage";

/** Cache tag for the published home page content. The admin hub clears it on publish (see homepage-actions.ts). */
export const SITE_CONTENT_TAG = "site-content";

/**
 * The published home page content, read on the server so the page and the navigation bar arrive complete
 * (no empty first paint, and a slow or failed browser request can no longer hide links).
 * Cached for a minute and cleared on demand when the owner publishes. If the API is unreachable the page
 * falls back to a minimal version rather than failing.
 */
export async function getSiteContent(): Promise<HomepageContent> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 60, expire: 3600 });
  cacheTag(SITE_CONTENT_TAG);

  const base = apiOrigin();

  try {
    const res = await fetch(`${base}/api/site-content`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return FALLBACK_CONTENT;
    return normalizeContent(await res.json());
  } catch {
    return FALLBACK_CONTENT;
  }
}

/**
 * The experience, education, skills, projects and certifications shown on the home page, read on the server in the same way as the content
 * (same cache, same on-demand clearing). A list that cannot be read comes back empty.
 */
export async function getHomepageLists(): Promise<HomepageLists> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 60, expire: 3600 });
  cacheTag(SITE_CONTENT_TAG);

  const base = apiOrigin();

  const read = async <T,>(path: string): Promise<T[]> => {
    try {
      const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(4000) });
      return res.ok ? ((await res.json()) as T[]) : [];
    } catch {
      return [];
    }
  };

  const [experience, education, skills, projects, certifications] = await Promise.all([
    read<ApiExperience>("/api/experience"),
    read<ApiEducation>("/api/education"),
    read<ApiSkill>("/api/skills"),
    read<ApiProject>("/api/projects"),
    read<ApiCertification>("/api/certifications"),
  ]);

  return {
    experience: mapExperience(experience),
    education: mapEducation(education),
    skills: mapSkills(skills),
    projects: mapProjects(projects),
    certifications: mapCertifications(certifications),
  };
}

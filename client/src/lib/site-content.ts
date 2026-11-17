import { cacheLife, cacheTag } from "next/cache";
import { apiOrigin } from "./api-origin";
import {
  mapCertifications, mapEducation, mapExperience, mapProjects, mapSkills,
  type ApiCertification, type ApiEducation, type ApiExperience, type ApiProject, type ApiSkill,
} from "./api-client";
import { FALLBACK_CONTENT, normalizeContent, type HomepageContent, type HomepageLists } from "./homepage";

/** Cache tag for the published home page content. The admin hub clears it on publish (see homepage-actions.ts). */
export const SITE_CONTENT_TAG = "site-content";

/** How long the real content is kept: a minute, and cleared on demand when the owner publishes. */
const CONTENT_LIFE = { stale: 300, revalidate: 60, expire: 3600 };

/**
 * How long a result built from the backup content (the API could not be reached) is kept: it is refreshed on the
 * next request after a second, so a page built while the API was unreachable (for example during a deploy) is
 * replaced by the real content as soon as someone visits, instead of a minute later.
 * `expire` and `stale` stay at 5 minutes on purpose: anything shorter makes Next.js leave the result out of the
 * prebuilt page, and the root layout reads it outside a Suspense boundary, so the build would fail instead.
 */
const FALLBACK_LIFE = { stale: 300, revalidate: 1, expire: 300 };

/** Logged (build log and server log) whenever the backup content is used, so an unreachable API is visible. */
function warnUnreachable(path: string, reason: unknown) {
  const detail = reason instanceof Error ? reason.message : String(reason);
  console.warn(`[site-content] ${apiOrigin()}${path} could not be read (${detail}); using the backup content for now.`);
}

/**
 * The published home page content, read on the server so the page and the navigation bar arrive complete
 * (no empty first paint, and a slow or failed browser request can no longer hide links).
 * If the API is unreachable the page falls back to a minimal version rather than failing, and tries again soon.
 */
export async function getSiteContent(): Promise<HomepageContent> {
  "use cache";
  cacheTag(SITE_CONTENT_TAG);

  const path = "/api/site-content";
  try {
    const res = await fetch(`${apiOrigin()}${path}`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const content = normalizeContent(await res.json());
    cacheLife(CONTENT_LIFE);
    return content;
  } catch (error) {
    warnUnreachable(path, error);
    cacheLife(FALLBACK_LIFE);
    return FALLBACK_CONTENT;
  }
}

/**
 * The experience, education, skills, projects and certifications shown on the home page, read on the server in the same way as the content
 * (same cache, same on-demand clearing). A list that cannot be read comes back empty, and the result is then kept
 * only briefly, like the backup content above.
 */
export async function getHomepageLists(): Promise<HomepageLists> {
  "use cache";
  cacheTag(SITE_CONTENT_TAG);

  let failed = false;
  const read = async <T,>(path: string): Promise<T[]> => {
    try {
      const res = await fetch(`${apiOrigin()}${path}`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T[];
    } catch (error) {
      failed = true;
      warnUnreachable(path, error);
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

  cacheLife(failed ? FALLBACK_LIFE : CONTENT_LIFE);

  return {
    experience: mapExperience(experience),
    education: mapEducation(education),
    skills: mapSkills(skills),
    projects: mapProjects(projects),
    certifications: mapCertifications(certifications),
  };
}

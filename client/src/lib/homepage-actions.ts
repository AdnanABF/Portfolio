"use server";

import { cookies } from "next/headers";
import { updateTag } from "next/cache";
import { apiOrigin } from "./api-origin";
import { SITE_CONTENT_TAG } from "./site-content";

/**
 * Called by the admin hub right after the API publishes, so visitors see the new home page straight away
 * instead of after the cache's minute is up. It only drops cached data; it changes nothing.
 *
 * Server actions can be called by anyone, so the caller's sign-in is checked first: the request's cookies are
 * sent to an admin-only API endpoint, and nothing is cleared unless the API accepts them.
 */
export async function refreshHomepageCache(): Promise<void> {
  const base = apiOrigin();
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return;

  const res = await fetch(`${base}/api/admin/site-content`, { headers: { cookie: cookieHeader }, cache: "no-store" }).catch(() => null);
  if (!res?.ok) return;

  updateTag(SITE_CONTENT_TAG);
}

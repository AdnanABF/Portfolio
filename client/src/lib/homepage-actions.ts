"use server";

import { updateTag } from "next/cache";
import { SITE_CONTENT_TAG } from "./site-content";

/**
 * Called by the admin hub right after the API publishes, so visitors see the new home page straight away
 * instead of after the cache's minute is up. It only drops cached data; it changes nothing.
 */
export async function refreshHomepageCache(): Promise<void> {
  updateTag(SITE_CONTENT_TAG);
}

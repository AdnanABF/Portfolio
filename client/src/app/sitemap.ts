import type { MetadataRoute } from "next";
import { getPosts, getProjects } from "@/lib/api-client";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [projects, posts] = await Promise.all([getProjects(), getPosts()]);

  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/projects`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...projects.map(
      (project): MetadataRoute.Sitemap[number] => ({
        url: `${SITE_URL}/projects/${project.slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      }),
    ),
    ...posts.map(
      (post): MetadataRoute.Sitemap[number] => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: post.publishedAt ? new Date(post.publishedAt) : now,
        changeFrequency: "monthly",
        priority: 0.6,
      }),
    ),
  ];
}

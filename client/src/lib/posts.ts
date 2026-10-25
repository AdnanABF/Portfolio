import type { ComponentType } from "react";
import BuildingThisSite from "../../content/blog/building-this-site.mdx";
import HelloWorld from "../../content/blog/hello-world.mdx";
import { getPosts } from "./api-client";
import type { PostItem } from "./types";

export interface PostEntry {
  meta: PostItem;
  Content?: ComponentType;
}

const CONTENT: Record<string, ComponentType> = {
  "building-this-site": BuildingThisSite,
  "hello-world": HelloWorld,
};

export async function getAllPosts(): Promise<PostItem[]> {
  const posts = await getPosts();
  return [...posts].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export async function getPost(slug: string): Promise<PostEntry | undefined> {
  const posts = await getPosts();
  const meta = posts.find((p) => p.slug === slug);
  if (!meta) return undefined;
  const Content = CONTENT[slug];
  return { meta, Content };
}

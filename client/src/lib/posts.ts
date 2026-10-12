import type { ComponentType } from "react";
import BuildingThisSite from "../../content/blog/building-this-site.mdx";
import HelloWorld from "../../content/blog/hello-world.mdx";
import { POSTS } from "./data";
import type { PostItem } from "./types";

export interface PostEntry {
  meta: PostItem;
  Content: ComponentType;
}

const CONTENT: Record<string, ComponentType> = {
  "building-this-site": BuildingThisSite,
  "hello-world": HelloWorld,
};

export function getAllPosts(): PostItem[] {
  return [...POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function getPost(slug: string): PostEntry | undefined {
  const meta = POSTS.find((p) => p.slug === slug);
  const Content = CONTENT[slug];
  if (!meta || !Content) return undefined;
  return { meta, Content };
}

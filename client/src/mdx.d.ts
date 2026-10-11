declare module "*.mdx" {
  import type { ComponentType } from "react";

  const MDXComponent: ComponentType;
  export default MDXComponent;

  export const metadata: {
    title: string;
    excerpt: string;
    publishedAt: string;
  };
}

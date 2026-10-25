import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/posts";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: `${post.meta.title} | Adnan Bin Farook`,
    description: post.meta.excerpt,
    alternates: { canonical: `/blog/${post.meta.slug}` },
  };
}

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || !post.Content) notFound();
  const { Content } = post;

  return (
    <article className="mx-auto max-w-3xl px-6 pt-28 pb-16 md:px-12">
      <Link
        href="/blog"
        className="mb-6 inline-flex items-center gap-2 font-mono text-sm text-muted transition-colors hover:text-primary"
      >
        ← All posts
      </Link>

      <div className="mb-2 font-mono text-sm text-primary">
        {formatDate(post.meta.publishedAt)}
      </div>
      <h1 className="mb-4 text-3xl font-black tracking-tight text-foreground md:text-5xl">
        {post.meta.title}
      </h1>
      <p className="mb-10 text-lg leading-relaxed text-muted">
        {post.meta.excerpt}
      </p>

      <div className="mdx-body">
        <Content />
      </div>
    </article>
  );
}

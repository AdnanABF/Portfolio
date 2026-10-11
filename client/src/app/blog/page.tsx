import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/effects/Reveal";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { POSTS } from "@/lib/data";
import { SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog | Adnan Bin Farook",
  description: `Notes on .NET, React, and shipping software. ${SITE_DESCRIPTION}`,
};

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 pt-28 pb-16 md:px-12">
      <h1 className="sr-only">Blog</h1>
      <Reveal>
        <SectionHeading
          eyebrow="// notes"
            title="Blog"
          description="Short posts on modernizing .NET systems, full-stack patterns, and self-hosting."
        />
      </Reveal>

      <div className="space-y-4">
        {POSTS.map((post, index) => (
          <Reveal key={post.slug} delay={index * 100}>
            <Link href={`/blog/${post.slug}`} className="block">
              <Card className="p-6 transition-all hover:-translate-y-1">
                <div className="mb-2 font-mono text-xs text-muted">
                  {formatDate(post.publishedAt)}
                </div>
                <h2 className="mb-2 text-xl font-bold text-foreground">
                  {post.title}
                </h2>
                <p className="text-sm leading-relaxed text-muted">
                  {post.excerpt}
                </p>
              </Card>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

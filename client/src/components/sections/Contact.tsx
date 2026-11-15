"use client";

import { Suspense } from "react";
import { Reveal } from "@/components/effects/Reveal";
import { useSiteContent } from "@/components/site/SiteContentProvider";
import { Card } from "@/components/ui/Card";
import { findLink, sectionOf } from "@/lib/homepage";
import { ContactForm } from "./ContactForm";
import { SectionHead } from "./SectionHead";

export function Contact() {
  const content = useSiteContent();
  const email = findLink(content, "email");
  const section = sectionOf(content, "contact");
  // The address on the card is shown without the mailto: prefix.
  const emailText = email?.url.replace(/^mailto:/i, "");

  return (
    <section id="contact" className="scroll-mt-24 bg-cream/50 px-6 py-20 md:px-12">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 md:grid-cols-2">
        <Reveal>
          <SectionHead section={section} align="left" compact />
          {content.contact.text ? (
            <p className="mb-8 leading-relaxed text-muted">{content.contact.text}</p>
          ) : null}
          <div className="space-y-4">
            {emailText ? (
              <Card className="p-4">
                <h3 className="mb-1 font-mono text-sm text-primary">Email</h3>
                <p className="text-foreground">{emailText}</p>
              </Card>
            ) : null}
            {content.location.address ? (
              <Card className="p-4">
                <h3 className="mb-1 font-mono text-sm text-primary">Location</h3>
                <p className="text-foreground">{content.location.address}</p>
              </Card>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={100}>
          {/* useSearchParams needs a Suspense boundary for static prerender */}
          <Suspense
            fallback={
              <div className="animate-pulse rounded-2xl border border-line bg-surface p-8">
                <div className="h-6 w-1/3 rounded bg-line/60" />
                <div className="mt-4 h-12 rounded-lg bg-line/40" />
                <div className="mt-4 h-12 rounded-lg bg-line/40" />
                <div className="mt-4 h-28 rounded-lg bg-line/40" />
              </div>
            }
          >
            <ContactForm />
          </Suspense>
        </Reveal>
      </div>
    </section>
  );
}

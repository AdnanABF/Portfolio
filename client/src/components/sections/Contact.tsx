import { Suspense } from "react";
import { Reveal } from "@/components/effects/Reveal";
import { Card } from "@/components/ui/Card";
import { SITE_EMAIL, SITE_LOCATION } from "@/lib/site";
import { ContactForm } from "./ContactForm";

export function Contact() {
  return (
    <section
      id="contact"
      className="scroll-mt-24 bg-cream/50 px-6 py-20 md:px-12"
    >
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 md:grid-cols-2">
        <Reveal>
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Let&apos;s <span className="text-primary">Connect</span>
          </h2>
          <p className="mb-8 leading-relaxed text-muted">
            Interested in migrating your legacy systems or building the next
            big platform? I&apos;m available for freelance projects and
            full-time opportunities.
          </p>
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="mb-1 font-mono text-sm text-primary">Email</h3>
              <p className="text-foreground">{SITE_EMAIL}</p>
            </Card>
            <Card className="p-4">
              <h3 className="mb-1 font-mono text-sm text-primary">Location</h3>
              <p className="text-foreground">{SITE_LOCATION}</p>
            </Card>
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

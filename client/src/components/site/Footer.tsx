import { Heart, Lock } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { YearNow } from "./YearNow";

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface py-8 text-center">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6">
        <nav
          aria-label="Footer"
          className="flex items-center gap-6 font-mono text-sm text-muted"
        >
          <Link href="/projects" className="transition-colors hover:text-primary">
            Projects
          </Link>
          <Link href="/blog" className="transition-colors hover:text-primary">
            Blog
          </Link>
          <Link href="/#contact" className="transition-colors hover:text-primary">
            Contact
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 opacity-60 transition-opacity hover:opacity-100 hover:text-primary"
            title="Admin Login"
            aria-label="Admin Login"
          >
            <Lock size={13} />
            <span>Admin</span>
          </Link>
        </nav>
        <p className="flex items-center justify-center gap-2 font-mono text-sm text-muted">
          ©{" "}
          <Suspense fallback="…">
            <YearNow />
          </Suspense>{" "}
          Designed & Built with{" "}
          <Heart size={14} className="fill-primary text-primary" /> using
          Next.js & Tailwind
        </p>
      </div>
    </footer>
  );
}

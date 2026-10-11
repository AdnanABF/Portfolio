import { Heart } from "lucide-react";
import { Suspense } from "react";
import { YearNow } from "./YearNow";

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface py-8 text-center">
      <div className="mx-auto max-w-7xl px-6">
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

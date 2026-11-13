"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Keeps every /admin page hidden from anyone who is not a signed-in admin. The proxy already redirects
 * logged-out visitors before the page is sent; this covers the rest: a session that expires while the page
 * is open, signing out, and navigating between admin pages inside the browser. Until the session is
 * confirmed, nothing but a loading screen is shown.
 *
 * Used by app/admin/layout.tsx, which is a server component so that it can export `instant = false`
 * (a client component cannot).
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin, isLoading } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/admin/login";
  const mustSignIn = !isLoginPage && !isLoading && !isAdmin;

  useEffect(() => {
    if (mustSignIn) {
      router.replace(`/admin/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [mustSignIn, pathname, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3 font-mono text-xs text-muted">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>{isLoading ? "Verifying admin session..." : "Redirecting to sign in..."}</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

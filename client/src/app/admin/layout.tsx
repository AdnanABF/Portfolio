import type { ReactNode } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";

// Admin pages are private and depend on the signed-in session, which is only known in the browser after
// load, so the guard shows a loading screen first and the page cannot be rendered for Next's instant
// navigation check. Opt the admin area out of that dev-only check. This must be a server component:
// `instant` cannot be exported from a client component, which is why the guard lives in AdminGuard.
export const instant = false;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}

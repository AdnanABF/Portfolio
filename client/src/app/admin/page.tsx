import { AdminDashboardPage } from "@/components/admin/DashboardPage";

// Server wrapper around the client page. `instant` can only be exported from a server component, and admin
// pages are private and only know the session in the browser, so they opt out of Next's dev-only
// instant-navigation check. The page itself lives in components/admin/DashboardPage.tsx.
export const instant = false;

export default function Page() {
  return <AdminDashboardPage />;
}

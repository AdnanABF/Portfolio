import { AdminSessionsPage } from "@/components/admin/SessionsPage";

// Server wrapper around the client page (see app/admin/page.tsx for why). The page itself lives in
// components/admin/SessionsPage.tsx.
export const instant = false;

export default function Page() {
  return <AdminSessionsPage />;
}

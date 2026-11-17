import { AdminActivityPage } from "@/components/admin/ActivityPage";

// Server wrapper around the client page (see app/admin/page.tsx for why). The page itself lives in
// components/admin/ActivityPage.tsx.
export const instant = false;

export default function Page() {
  return <AdminActivityPage />;
}

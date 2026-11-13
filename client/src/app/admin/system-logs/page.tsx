import { AdminSystemLogsPage } from "@/components/admin/SystemLogsPage";

// Server wrapper around the client page (see app/admin/page.tsx for why). The page itself lives in
// components/admin/SystemLogsPage.tsx.
export const instant = false;

export default function Page() {
  return <AdminSystemLogsPage />;
}

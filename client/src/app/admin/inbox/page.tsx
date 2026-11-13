import { AdminInboxPage } from "@/components/admin/InboxPage";

// Server wrapper around the client page (see app/admin/page.tsx for why). The page itself lives in
// components/admin/InboxPage.tsx.
export const instant = false;

export default function Page() {
  return <AdminInboxPage />;
}

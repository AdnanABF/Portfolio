import { AdminMembersPage } from "@/components/admin/MembersPage";

// Server wrapper around the client page (see app/admin/page.tsx for why). The page itself lives in
// components/admin/MembersPage.tsx.
export const instant = false;

export default function Page() {
  return <AdminMembersPage />;
}

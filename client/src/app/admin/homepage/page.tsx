import { AdminHomepageEditor } from "@/components/admin/homepage/HomepageEditor";

// Server wrapper around the client page (see app/admin/page.tsx for why). The editor lives in
// components/admin/homepage/HomepageEditor.tsx.
export const instant = false;

export default function Page() {
  return <AdminHomepageEditor />;
}

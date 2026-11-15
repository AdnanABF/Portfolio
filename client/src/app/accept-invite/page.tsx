import { Suspense } from "react";
import type { Metadata } from "next";
import { SetPasswordForm } from "@/components/account/LinkPages";

// Account pages are for signed-in or signing-in people only, so search engines are asked to leave them out.
export const metadata: Metadata = {
  title: "Accept your invitation",
  robots: { index: false, follow: false },
};

// Server wrapper around the client page (see app/admin/page.tsx for why).
export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SetPasswordForm kind="accept-invite" />
    </Suspense>
  );
}

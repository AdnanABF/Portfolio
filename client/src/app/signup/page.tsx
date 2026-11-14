import type { Metadata } from "next";
import { SignUpForm } from "@/components/account/SignUpForm";

// Account pages are for signed-in or signing-in people only, so search engines are asked to leave them out.
export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

// Server wrapper around the client page (see app/admin/page.tsx for why).
export const instant = false;

export default function Page() {
  return <SignUpForm />;
}

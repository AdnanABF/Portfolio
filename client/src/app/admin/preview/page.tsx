import type { Metadata } from "next";
import { PreviewFrame } from "@/components/admin/homepage/PreviewFrame";

// The frame shown inside the home page editor. Private: it is never indexed.
export const instant = false;
export const metadata: Metadata = { title: "Home page preview", robots: "noindex, nofollow" };

export default function Page() {
  return <PreviewFrame />;
}

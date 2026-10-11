import type { Metadata } from "next";
import { Projects } from "@/components/sections/Projects";
import { SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  title: "Projects | Adnan Bin Farook",
  description: `Selected full-stack work. ${SITE_DESCRIPTION}`,
};

export default function ProjectsPage() {
  return (
    <div className="pt-20">
      <h1 className="sr-only">Projects</h1>
      <Projects />
    </div>
  );
}

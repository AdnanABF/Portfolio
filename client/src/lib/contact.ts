import { z } from "zod";
import { getProjectBySlug } from "./data";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email"),
  subject: z.string().trim().min(3, "Subject is required"),
  message: z
    .string()
    .trim()
    .min(10, "Message too short")
    .max(2000, "Message too long"),
  /** Honeypot — must stay empty. */
  website: z.string().optional(),
  /** Client timestamp (ms) when the form was opened; rejects instant bots. */
  startedAt: z.number(),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const MIN_FORM_FILL_MS = 4000;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const RATE_LIMIT_MAX = 3;
export const COOLDOWN_MS = 30 * 1000;

/** Build prefill values for a private-repo access request (?request=slug). */
export function accessRequestPrefill(slug: string | null): {
  subject: string;
  message: string;
} | null {
  if (!slug) return null;
  const project = getProjectBySlug(slug);
  if (!project) return null;
  return {
    subject: `Request Access for ${project.title}`,
    message: `Hi Adnan, I'm interested in viewing the source code for "${project.title}". Could you please provide access to the repository?`,
  };
}

export function isAccessRequest(subject: string): boolean {
  return subject.toLowerCase().includes("request access");
}

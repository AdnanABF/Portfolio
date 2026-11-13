"use server";

import { headers } from "next/headers";
import { MIN_FORM_FILL_MS, contactSchema, type ContactInput } from "./contact";

export interface SendResult {
  ok: boolean;
  error?: string;
  retryAfterSec?: number;
}

// The API does the real work: it saves the message, applies the rate limit (keyed on the real
// client IP) and sends the emails through Resend. Nothing is limited or emailed from here.
const RATE_LIMITED_MESSAGE = "Too many messages sent. Please try again in about 10 minutes.";
const NOT_CONFIGURED_MESSAGE = "The contact service is not configured yet. Please email directly.";

function apiBase(): string | undefined {
  // Prefer the internal URL so the hop stays on the private Docker network.
  return (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL)?.replace(/\/$/, "");
}

// Real visitor IP chain as set by the edge proxy (Traefik). The API trusts this container's
// network hop and walks the chain itself, so it must be forwarded unchanged.
async function forwardedChain(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for");
}

/** Spam checks shared by both forms. Returns a result to send back, or null to continue. */
function earlyResult(data: ContactInput): SendResult | null {
  // Honeypot: pretend success so bots learn nothing.
  if (data.website?.trim()) {
    return { ok: true };
  }

  if (Date.now() - data.startedAt < MIN_FORM_FILL_MS) {
    return { ok: false, error: "Please take a moment before sending." };
  }

  return null;
}

async function postToApi(
  path: string,
  body: Record<string, string>,
  failureMessage: string,
): Promise<SendResult> {
  const base = apiBase();
  if (!base) {
    return { ok: false, error: NOT_CONFIGURED_MESSAGE };
  }

  const chain = await forwardedChain();
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(chain ? { "X-Forwarded-For": chain } : {}),
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return { ok: true };
    }

    if (res.status === 429) {
      return { ok: false, error: RATE_LIMITED_MESSAGE };
    }

    // The API explains a refusal in `message` (for example a repo that is not private).
    if (res.status === 400 || res.status === 404) {
      const detail = await res.json().catch(() => null);
      if (detail && typeof detail.message === "string") {
        return { ok: false, error: detail.message };
      }
    }

    return { ok: false, error: failureMessage };
  } catch {
    return {
      ok: false,
      error: "Unable to reach backend service. Please email directly.",
    };
  }
}

/** Normal contact message: saved by the API, which emails me and sends the visitor an acknowledgement. */
export async function sendContact(input: ContactInput): Promise<SendResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields." };
  }
  const data = parsed.data;

  const early = earlyResult(data);
  if (early) return early;

  return postToApi(
    "/api/contact",
    {
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
    },
    "Failed to send your message. Please try again.",
  );
}

/**
 * Repo access request for a private project. It goes to the project endpoint, not the contact
 * endpoint: the API stores it as a repo request, and the subject is generated on the server.
 */
export async function sendRepoRequest(
  projectSlug: string,
  input: ContactInput,
): Promise<SendResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields." };
  }
  const data = parsed.data;

  const early = earlyResult(data);
  if (early) return early;

  // The slug becomes part of the URL path, so only accept the shape project slugs have.
  if (!/^[a-z0-9-]{1,100}$/.test(projectSlug)) {
    return { ok: false, error: "This project could not be found." };
  }

  return postToApi(
    `/api/projects/${projectSlug}/access-requests`,
    {
      name: data.name,
      email: data.email,
      message: data.message,
    },
    "Failed to send your request. Please try again.",
  );
}

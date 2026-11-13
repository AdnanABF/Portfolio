"use server";

import { headers } from "next/headers";
import emailjs from "@emailjs/nodejs";
import { MIN_FORM_FILL_MS, contactSchema, type ContactInput } from "./contact";

export interface SendResult {
  ok: boolean;
  error?: string;
  retryAfterSec?: number;
}

// Rate limiting is enforced only by the API (contact-rate-limit policy, keyed on the
// real client IP). Nothing is limited here, because an in-memory limiter in this process
// could be bypassed through client-controlled headers and resets on every restart.
const RATE_LIMITED_MESSAGE = "Too many messages sent. Please try again in about 10 minutes.";

// Real visitor IP chain as set by the edge proxy (Traefik). The API trusts this container's
// network hop and walks the chain itself, so it must be forwarded unchanged.
async function forwardedChain(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for");
}

export async function sendContact(input: ContactInput): Promise<SendResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields." };
  }
  const data = parsed.data;

  // Honeypot: pretend success so bots learn nothing.
  if (data.website?.trim()) {
    return { ok: true };
  }

  if (Date.now() - data.startedAt < MIN_FORM_FILL_MS) {
    return { ok: false, error: "Please take a moment before sending." };
  }

  // Prefer the internal URL so the hop stays on the private Docker network.
  const apiBase = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL)?.replace(/\/$/, "");
  if (apiBase) {
    const chain = await forwardedChain();
    try {
      const res = await fetch(`${apiBase}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(chain ? { "X-Forwarded-For": chain } : {}),
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
        }),
      });

      if (res.ok) {
        return { ok: true };
      }

      if (res.status === 429) {
        return { ok: false, error: RATE_LIMITED_MESSAGE };
      }

      return {
        ok: false,
        error: "Failed to transmit via backend API. Please try again.",
      };
    } catch {
      return {
        ok: false,
        error: "Unable to reach backend service. Please email directly.",
      };
    }
  }

  // Fallback when no API is configured: server-side EmailJS (same account + templates v1
  // used in the browser). All keys stay on the server. This path has no rate limit.
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const autoreplyTemplateId = process.env.EMAILJS_AUTOREPLY_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;
  if (!serviceId || !templateId || !publicKey || !privateKey) {
    return {
      ok: false,
      error: "Email service is not configured yet. Please email directly.",
    };
  }

  const stamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Same template params v1 sent — existing templates work unchanged.
  const templateParams = {
    name: data.name,
    email: data.email,
    subject: data.subject,
    message: data.message,
    time: stamp,
  };
  const auth = { publicKey, privateKey };

  try {
    // 1. Notify the owner.
    await emailjs.send(serviceId, templateId, templateParams, auth);

    // 2. Auto-reply to the sender (best-effort).
    if (autoreplyTemplateId) {
      await emailjs.send(
        serviceId,
        autoreplyTemplateId,
        templateParams,
        auth,
      );
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Failed to transmit. Please check your connection and try again.",
    };
  }
}

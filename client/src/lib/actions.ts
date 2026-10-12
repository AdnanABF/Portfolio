"use server";

import { headers } from "next/headers";
import emailjs from "@emailjs/nodejs";
import {
  COOLDOWN_MS,
  MIN_FORM_FILL_MS,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  contactSchema,
  type ContactInput,
} from "./contact";

export interface SendResult {
  ok: boolean;
  error?: string;
  retryAfterSec?: number;
}

// In-memory per-IP ledger. Single Coolify container — no shared state needed.
// (If ever scaled horizontally, move this to Redis/Upstash.)
const attempts = new Map<string, number[]>();
const lastSent = new Map<string, number>();

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

function prune(ip: string, now: number): number[] {
  const recent = (attempts.get(ip) ?? []).filter(
    (t) => Number.isFinite(t) && now - t < RATE_LIMIT_WINDOW_MS,
  );
  attempts.set(ip, recent);
  return recent;
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

  const now = Date.now();
  if (now - data.startedAt < MIN_FORM_FILL_MS) {
    return { ok: false, error: "Please take a moment before sending." };
  }

  const ip = await clientIp();
  const cooledUntil = (lastSent.get(ip) ?? 0) + COOLDOWN_MS;
  if (now < cooledUntil) {
    return {
      ok: false,
      error: `Please wait ${Math.ceil((cooledUntil - now) / 1000)}s before sending again.`,
      retryAfterSec: Math.ceil((cooledUntil - now) / 1000),
    };
  }

  const recent = prune(ip, now);
  if (recent.length >= RATE_LIMIT_MAX) {
    return {
      ok: false,
      error: "Submission limit reached. Please try again in about an hour.",
    };
  }

  // If a dedicated remote backend exists (server/), forward the validated payload.
  const remoteApi = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (remoteApi) {
    try {
      const res = await fetch(`${remoteApi}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
        }),
      });

      if (res.ok) {
        attempts.set(ip, [...recent, now]);
        lastSent.set(ip, now);
        return { ok: true };
      }

      if (res.status === 429) {
        return {
          ok: false,
          error: "Submission limit reached. Please try again in about an hour.",
        };
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

  // Server-side EmailJS (same account + templates v1 used in the browser).
  // All keys stay on the server — nothing is exposed to the client.
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

    attempts.set(ip, [...recent, now]);
    lastSent.set(ip, now);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Failed to transmit. Please check your connection and try again.",
    };
  }
}

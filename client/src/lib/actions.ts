"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import {
  COOLDOWN_MS,
  MIN_FORM_FILL_MS,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  contactSchema,
  type ContactInput,
} from "./contact";
import { SITE_EMAIL } from "./site";

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

  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM ?? `Portfolio <hello@adnanbinfarook.com>`;
  const to = process.env.CONTACT_TO_EMAIL ?? SITE_EMAIL;
  if (!apiKey) {
    return {
      ok: false,
      error: "Email service is not configured yet. Please email directly.",
    };
  }

  const stamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  try {
    const resend = new Resend(apiKey);

    // 1. Notify the owner.
    const owner = await resend.emails.send({
      from,
      to,
      replyTo: data.email,
      subject: `[Portfolio] ${data.subject}`,
      text: `From: ${data.name} <${data.email}>\nTime: ${stamp}\n\n${data.message}`,
    });
    if (owner.error) throw new Error(owner.error.message);

    // 2. Auto-reply to the sender (best-effort).
    await resend.emails.send({
      from,
      to: data.email,
      subject: "Thanks for reaching out!",
      text: `Hi ${data.name},\n\nThanks for your message — I'll get back to you soon.\n\n— Adnan`,
    });

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

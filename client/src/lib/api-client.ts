import type {
  ActivityLogPage,
  ActivityLogQuery,
  ExperienceItem,
  InquiryPage,
  InquiryQuery,
  MemberActionResult,
  MemberFormValues,
  MemberItem,
  MemberPage,
  MemberQuery,
  PostItem,
  ProjectItem,
  SessionItem,
  Skill,
  SystemLogPage,
  SystemLogQuery,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export function resolveUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

/** An API call that failed with an HTTP status, so callers can tell "signed out" (401) from other failures. */
export class ApiError extends Error {
  readonly status: number;

  /** Messages from the server's validation, by field name (first letter lower case), for showing next to inputs. */
  readonly fieldErrors: Record<string, string[]>;

  /** A machine-readable reason some endpoints add, for example "email_not_verified". */
  readonly code?: string;

  constructor(message: string, status: number, options: { fieldErrors?: Record<string, string[]>; code?: string } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = options.fieldErrors ?? {};
    this.code = options.code;
  }
}

/**
 * Turns a failed response into an ApiError. The API answers in two shapes: { message, errors } (errors by field)
 * and a plain { Field: [messages] } object from request validation. Both end up as fieldErrors.
 */
async function readApiError(res: Response, fallback: string): Promise<ApiError> {
  const body: unknown = await res.json().catch(() => null);
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;

  let message = typeof record?.message === "string" ? record.message : fallback;
  const code = typeof record?.code === "string" ? record.code : undefined;

  const source =
    record && typeof record.errors === "object" && record.errors
      ? (record.errors as Record<string, unknown>)
      : record && record.message === undefined
        ? record
        : null;

  const fieldErrors: Record<string, string[]> = {};
  if (source) {
    for (const [key, value] of Object.entries(source)) {
      if (!Array.isArray(value)) continue;
      fieldErrors[key.charAt(0).toLowerCase() + key.slice(1)] = value.map(String);
    }
    if (typeof record?.message !== "string") {
      const first = Object.values(fieldErrors)[0]?.[0];
      if (first) message = first;
    }
  }

  return new ApiError(message, res.status, { fieldErrors, code });
}

/** Sends JSON (or nothing) and returns the parsed JSON answer, or undefined for an empty one. */
async function sendJson<T>(path: string, method: string, body: unknown, fallback: string): Promise<T> {
  const res = await safeFetch(
    resolveUrl(path),
    {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    10000,
  );
  if (!res.ok) throw await readApiError(res, fallback);
  if (res.status === 204) return undefined as T;
  return (await res.json().catch(() => undefined)) as T;
}

/** True when the error means the admin session is missing, expired or revoked. */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

function safeFetch(url: string, init?: RequestInit, timeoutMs = 3000): Promise<Response> {
  const signal = init?.signal || AbortSignal.timeout(timeoutMs);
  return fetch(url, { ...init, signal });
}

// ==========================================
// Public Content Methods (Dynamic Backend API)
// ==========================================

interface ApiProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  tags?: string[];
  githubUrl?: string;
  liveUrl?: string;
  heroImageUrl?: string;
  isPublished?: boolean;
  isRepoPrivate?: boolean;
}

interface ApiPost {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt?: string;
}

interface ApiExperience {
  id: string;
  role: string;
  company: string;
  period: string;
  achievements?: string[];
}

interface ApiSkill {
  id?: string;
  name: string;
  category: string;
}

export async function getProjects(): Promise<ProjectItem[]> {
  try {
    const res = await safeFetch(resolveUrl("/api/projects"), {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data: ApiProject[] = await res.json();
    return data.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      techStack: p.tags || [],
      githubUrl: p.githubUrl,
      liveUrl: p.liveUrl,
      imageUrl: p.heroImageUrl || "/og-image.png",
      isPrivate: p.isRepoPrivate ?? false,
      isPublished: p.isPublished ?? true,
    }));
  } catch {
    return [];
  }
}

export async function getProject(slug: string): Promise<ProjectItem | undefined> {
  try {
    const res = await safeFetch(resolveUrl(`/api/projects/${slug}`), {
      next: { revalidate: 60 },
    });
    if (!res.ok) return undefined;
    const p: ApiProject = await res.json();
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      techStack: p.tags || [],
      githubUrl: p.githubUrl,
      liveUrl: p.liveUrl,
      imageUrl: p.heroImageUrl || "/og-image.png",
      isPrivate: p.isRepoPrivate ?? false,
      isPublished: p.isPublished ?? true,
    };
  } catch {
    return undefined;
  }
}

export async function getPosts(): Promise<PostItem[]> {
  try {
    const res = await safeFetch(resolveUrl("/api/blog"), {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data: ApiPost[] = await res.json();
    return data.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      publishedAt: p.publishedAt ? p.publishedAt.split("T")[0] : "",
    }));
  } catch {
    return [];
  }
}

export async function getExperience(): Promise<ExperienceItem[]> {
  try {
    const res = await safeFetch(resolveUrl("/api/experience"), {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data: ApiExperience[] = await res.json();
    return data.map((e) => ({
      id: e.id,
      role: e.role,
      company: e.company,
      period: e.period,
      description: e.achievements || [],
      tech: [],
    }));
  } catch {
    return [];
  }
}

export async function getSkills(): Promise<Skill[]> {
  try {
    const res = await safeFetch(resolveUrl("/api/skills"), {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data: ApiSkill[] = await res.json();
    return data.map((s) => {
      const validCategories: Array<"Modern" | "Microsoft" | "Legacy" | "Tools"> = [
        "Modern",
        "Microsoft",
        "Legacy",
        "Tools",
      ];
      const category = validCategories.find(
        (c) => c.toLowerCase() === s.category.toLowerCase()
      ) || "Modern";

      return {
        id: s.id,
        name: s.name,
        category,
        level: 80,
      };
    });
  } catch {
    return [];
  }
}

export async function getSettings(): Promise<Record<string, string>> {
  try {
    const res = await safeFetch(resolveUrl("/api/settings"), {
      next: { revalidate: 60 },
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export async function getHealth(): Promise<{ status: string; dbLatencyMs: number; uptimeSeconds: number } | null> {
  try {
    const res = await safeFetch(resolveUrl("/api/health"), { cache: "no-store" }, 2000);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ==========================================
// Telemetry & Contact
// ==========================================

export async function trackVisit(path: string, referrer?: string): Promise<void> {
  try {
    await safeFetch(resolveUrl("/api/telemetry/visit"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, referrer }),
    });
  } catch {
    // Silent fail
  }
}

export async function trackCvDownload(referrer?: string): Promise<void> {
  try {
    await safeFetch(resolveUrl("/api/telemetry/cv-download"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrer }),
    });
  } catch {
    // Silent fail
  }
}

export async function submitContact(data: { name: string; email: string; subject: string; message: string }) {
  const res = await fetch(resolveUrl("/api/contact"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to submit inquiry.");
  return await res.json();
}

// ==========================================
// Admin & Mutation API
// ==========================================

export async function apiLogin(email: string, password: string) {
  const res = await fetch(resolveUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    if (res.status === 429) {
      throw new ApiError("Too many login attempts. Please wait 15 minutes before trying again.", 429);
    }
    throw await readApiError(res, "Login failed.");
  }
  return await res.json();
}

export async function apiLogout() {
  const res = await fetch(resolveUrl("/api/auth/logout"), {
    method: "POST",
    credentials: "include",
  });
  return res.ok;
}

export async function getMe() {
  try {
    const res = await safeFetch(resolveUrl("/api/auth/me"), {
      credentials: "include",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function createProject(dto: Record<string, unknown>) {
  const res = await fetch(resolveUrl("/api/projects"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to create project.");
  return await res.json();
}

export async function updateProject(id: string, dto: Record<string, unknown>) {
  const res = await fetch(resolveUrl(`/api/projects/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to update project.");
  return await res.json();
}

export async function updateSetting(key: string, value: string) {
  const res = await fetch(resolveUrl(`/api/settings/${key}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`Failed to update setting ${key}.`);
  return await res.json();
}

export async function createExperience(dto: Record<string, unknown>) {
  const res = await fetch(resolveUrl("/api/experience"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to create experience.");
  return await res.json();
}

export async function updateExperience(id: string, dto: Record<string, unknown>) {
  const res = await fetch(resolveUrl(`/api/experience/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to update experience.");
  return await res.json();
}

export async function createSkill(dto: { name: string; category: string; iconName?: string; sortOrder?: number }) {
  const res = await fetch(resolveUrl("/api/skills"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to create skill.");
  return await res.json();
}

export async function updateSkill(id: string, dto: { name: string; category: string; iconName?: string; sortOrder?: number }) {
  const res = await fetch(resolveUrl(`/api/skills/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to update skill.");
  return await res.json();
}

export async function deleteSkill(id: string) {
  const res = await fetch(resolveUrl(`/api/skills/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete skill.");
  return true;
}

export interface UploadMediaResponse {
  id: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  url: string;
  category: string;
  accessPolicy: string;
  createdAt: string;
}

export async function uploadMedia(
  file: File,
  category = "general",
  entityId?: string,
  entityType?: string,
  accessPolicy = "Inherit"
): Promise<UploadMediaResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  if (entityId) formData.append("entityId", entityId);
  if (entityType) formData.append("entityType", entityType);
  if (accessPolicy) formData.append("accessPolicy", accessPolicy);

  const res = await fetch(resolveUrl("/api/media/upload"), {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message =
      errorBody.message ||
      (errorBody.errors ? Object.values(errorBody.errors).flat().join(" ") : null) ||
      "Failed to upload media.";
    throw new Error(message);
  }

  const data: UploadMediaResponse = await res.json();
  const publicUrl = data.url.startsWith("/api/media/")
    ? data.url.replace(/^\/api/, "")
    : data.url;

  return {
    ...data,
    url: publicUrl,
  };
}

/** Builds "?a=1&b=2" from a query object, leaving out empty values. */
function logQueryString(query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Reads a paged response and fails when it is not one (for example an older API still returning a bare list),
 * so the page shows "could not load" instead of silently showing no logs.
 */
async function readPage<T extends { items: unknown[]; totalCount: number }>(res: Response, what: string): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!body || !Array.isArray(body.items) || typeof body.totalCount !== "number") {
    throw new ApiError(`Unexpected response while loading ${what}.`, 502);
  }
  return body as T;
}

/** One page of the admin activity log. Throws when the request fails, so the page can show an error. */
export async function getAdminActivity(query: ActivityLogQuery = {}): Promise<ActivityLogPage> {
  const res = await safeFetch(
    resolveUrl(`/api/admin/activity${logQueryString(query)}`),
    { credentials: "include" },
    10000,
  );
  if (!res.ok) throw new ApiError("Failed to load activity logs.", res.status);
  return await readPage<ActivityLogPage>(res, "activity logs");
}

/** One page of the admin system (error) log. Throws when the request fails, so the page can show an error. */
export async function getAdminSystemLogs(query: SystemLogQuery = {}): Promise<SystemLogPage> {
  const res = await safeFetch(
    resolveUrl(`/api/admin/system-logs${logQueryString(query)}`),
    { credentials: "include" },
    10000,
  );
  if (!res.ok) throw new ApiError("Failed to load system logs.", res.status);
  const page = await readPage<SystemLogPage>(res, "system logs");
  if (
    typeof page.errorCount !== "number" ||
    typeof page.warningCount !== "number" ||
    typeof page.informationCount !== "number"
  ) {
    throw new ApiError("Unexpected response while loading system logs.", 502);
  }
  return page;
}

export async function getAdminAnalytics() {
  try {
    const res = await safeFetch(resolveUrl("/api/telemetry/summary"), {
      credentials: "include",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * One page of the admin inbox. Search, filters and paging are done by the API.
 * Throws when the request fails, so the inbox can show an error instead of an empty list.
 */
export async function getAdminInquiries(query: InquiryQuery = {}): Promise<InquiryPage> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.type) params.set("type", query.type);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));

  const qs = params.toString();
  const res = await safeFetch(
    resolveUrl(`/api/contact/inquiries${qs ? `?${qs}` : ""}`),
    { credentials: "include" },
    10000,
  );
  if (!res.ok) throw new ApiError("Failed to load messages.", res.status);
  return await res.json();
}

export async function updateInquiryStatus(id: string, status: string) {
  const res = await fetch(resolveUrl(`/api/contact/inquiries/${id}/status`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(status),
  });
  if (!res.ok) throw new ApiError("Failed to update inquiry status.", res.status);
  return await res.json();
}

/** Sets the same status on several messages. Returns how many were updated. */
export async function bulkUpdateInquiryStatus(ids: string[], status: string): Promise<number> {
  const res = await fetch(resolveUrl("/api/contact/inquiries/bulk-status"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ids, status }),
  });
  if (!res.ok) throw new ApiError("Failed to update the selected messages.", res.status);
  const body = await res.json();
  return typeof body.updated === "number" ? body.updated : 0;
}

// ==========================================
// Members panel (SuperAdmin) and the signed-in member's own account
// ==========================================

function memberQueryString(query: MemberQuery): string {
  return logQueryString(query);
}

/** One page of members. Search, filters and paging are done by the API. */
export async function getMembers(query: MemberQuery = {}): Promise<MemberPage> {
  const res = await safeFetch(
    resolveUrl(`/api/admin/users${memberQueryString(query)}`),
    { credentials: "include" },
    10000,
  );
  if (!res.ok) throw await readApiError(res, "Failed to load members.");
  return await readPage<MemberPage>(res, "members");
}

export const getMember = (id: string) =>
  sendJson<MemberItem>(`/api/admin/users/${id}`, "GET", undefined, "Failed to load the member.");

export const createMember = (values: MemberFormValues) =>
  sendJson<MemberActionResult>("/api/admin/users", "POST", values, "Failed to add the member.");

export const updateMember = (id: string, values: MemberFormValues) =>
  sendJson<MemberActionResult>(`/api/admin/users/${id}`, "PUT", values, "Failed to save the member.");

export const setMemberActive = (id: string, active: boolean) =>
  sendJson<MemberItem>(`/api/admin/users/${id}/${active ? "activate" : "deactivate"}`, "POST", undefined, "Failed to change the member.");

/** Soft delete: the member is hidden and cannot sign in, but can be restored. */
export const deleteMember = (id: string) =>
  sendJson<MemberItem>(`/api/admin/users/${id}`, "DELETE", undefined, "Failed to delete the member.");

export const restoreMember = (id: string) =>
  sendJson<MemberItem>(`/api/admin/users/${id}/restore`, "POST", undefined, "Failed to restore the member.");

/** Permanent erase. The email has to be typed again as a safety check. */
export const eraseMember = (id: string, confirmEmail: string) =>
  sendJson<void>(`/api/admin/users/${id}/erase`, "DELETE", { confirmEmail }, "Failed to erase the member.");

export const resendMemberInvite = (id: string) =>
  sendJson<{ emailSent: boolean }>(`/api/admin/users/${id}/resend-invite`, "POST", undefined, "Failed to send the invite.");

export const sendMemberPasswordReset = (id: string) =>
  sendJson<{ emailSent: boolean }>(`/api/admin/users/${id}/reset-password`, "POST", undefined, "Failed to send the reset link.");

export const getMemberSessions = (id: string, includeEnded: boolean) =>
  sendJson<SessionItem[]>(`/api/admin/users/${id}/sessions?includeEnded=${includeEnded}`, "GET", undefined, "Failed to load sessions.");

export const revokeMemberSession = (id: string, sessionId: string) =>
  sendJson<void>(`/api/admin/users/${id}/sessions/${sessionId}`, "DELETE", undefined, "Failed to revoke the session.");

export const revokeAllMemberSessions = (id: string) =>
  sendJson<void>(`/api/admin/users/${id}/sessions/revoke-all`, "POST", undefined, "Failed to revoke the sessions.");

/** One page of what a member did (sign-ins, edits): the activity log entries they wrote. */
export async function getMemberActivity(id: string, query: { page?: number; pageSize?: number } = {}): Promise<ActivityLogPage> {
  const res = await safeFetch(
    resolveUrl(`/api/admin/users/${id}/activity${logQueryString(query)}`),
    { credentials: "include" },
    10000,
  );
  if (!res.ok) throw await readApiError(res, "Failed to load the history.");
  return await readPage<ActivityLogPage>(res, "member history");
}

// ---- public account endpoints (sign-up, verification, invites, password reset) ----

/** fillTimeMs and contactPrefUrl are the bot traps: how long the form was open, and a hidden field that stays empty. */
export const registerAccount = (values: { fullName: string; email: string; password: string; contactPrefUrl: string; fillTimeMs: number }) =>
  sendJson<{ message: string }>("/api/auth/register", "POST", values, "Sign-up failed.");

export const verifyEmail = (userId: string, token: string) =>
  sendJson<{ message: string }>("/api/auth/verify-email", "POST", { userId, token }, "This link is invalid or has expired.");

/** Accepts an invite or finishes a password reset (the link proves the person owns the mailbox). */
export const setPasswordWithToken = (kind: "accept-invite" | "reset-password", userId: string, token: string, password: string) =>
  sendJson<{ message: string }>(`/api/auth/${kind}`, "POST", { userId, token, password }, "This link is invalid or has expired.");

export const forgotPassword = (email: string) =>
  sendJson<{ message: string }>("/api/auth/forgot-password", "POST", { email }, "Could not send the reset link.");

export const resendVerification = (email: string) =>
  sendJson<{ message: string }>("/api/auth/resend-verification", "POST", { email }, "Could not send the link.");

export const updateProfile = (fullName: string) =>
  sendJson<{ fullName: string }>("/api/auth/profile", "PUT", { fullName }, "Could not save your name.");

export const changePassword = (currentPassword: string, newPassword: string) =>
  sendJson<{ message: string }>("/api/auth/change-password", "POST", { currentPassword, newPassword }, "Could not change your password.");

export const getMySessions = () =>
  sendJson<SessionItem[]>("/api/auth/sessions", "GET", undefined, "Failed to load your sessions.");

export const revokeMySession = (id: string) =>
  sendJson<void>(`/api/auth/sessions/${id}`, "DELETE", undefined, "Failed to revoke the session.");

/** Signs the member out of every device, including this one. */
export const revokeAllMySessions = () =>
  sendJson<void>("/api/auth/sessions/revoke-all", "POST", undefined, "Failed to sign out everywhere.");

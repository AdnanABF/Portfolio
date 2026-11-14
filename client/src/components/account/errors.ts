import { ApiError } from "@/lib/api-client";

/** The sentence to show a person when a request failed. Rate limits get their own, friendlier wording. */
export function errorText(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Too many attempts. Please wait a few minutes and try again.";
    return error.message || fallback;
  }
  return fallback;
}

/** The first server message for a field, if the server named one. */
export function fieldError(error: unknown, field: string): string | undefined {
  return error instanceof ApiError ? error.fieldErrors[field]?.[0] : undefined;
}

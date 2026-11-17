/**
 * Remembers, across the redirect to the sign-in page, that a signed-in visitor's session was ended by the server (it was
 * revoked or it expired), so the sign-in form can say so instead of just appearing. Kept in sessionStorage; if the
 * browser blocks it the message is simply skipped.
 */
const KEY = "session-ended";

export function markSessionEnded(): void {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    // Storage is unavailable: no message, nothing else changes.
  }
}

/** True once if the flag was set, and clears it so the message shows a single time. */
export function consumeSessionEnded(): boolean {
  try {
    const set = window.sessionStorage.getItem(KEY) === "1";
    if (set) window.sessionStorage.removeItem(KEY);
    return set;
  } catch {
    return false;
  }
}

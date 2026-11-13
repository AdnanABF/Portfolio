import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16 calls this convention "proxy" (it was "middleware"). It runs before every /admin request.
//
// A session cookie only proves that a cookie exists. It can be expired or revoked on the server, and a
// logged-out browser can still hold an old one. So for /admin pages the proxy asks the API whether the
// session is real and redirects to the login page when it is not, before any admin page is sent.
// The API still enforces authorisation on every data request; this check only keeps logged-out users
// from seeing the admin pages.
const API_BASE = (
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5065"
).replace(/\/$/, "");

const SESSION_COOKIES = ["portfolio_session", "__Host-portfolio_session"];

async function hasValidAdminSession(cookieHeader: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { cookie: cookieHeader },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;

    const me = await res.json();
    return Boolean(me?.isAdmin) || me?.role === "Admin" || me?.role === "SuperAdmin";
  } catch {
    // API unreachable or too slow: treat as signed out. Nothing in /admin works without the API anyway.
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // The login page is always reachable. It sends genuinely signed-in admins on to /admin itself,
  // and redirecting away from it on a cookie alone would trap anyone holding a stale cookie.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const toLogin = () => {
    const loginUrl = new URL("/admin/login", request.url);
    // Keep the page (and its filters) so signing in lands the admin back where they were.
    loginUrl.searchParams.set("from", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  };

  const hasSessionCookie = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasSessionCookie) {
    return toLogin();
  }

  // Forward the browser's cookies so the API can recognise the session.
  const signedIn = await hasValidAdminSession(request.headers.get("cookie") ?? "");
  return signedIn ? NextResponse.next() : toLogin();
}

export const config = {
  matcher: ["/admin/:path*"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { apiOrigin } from "@/lib/api-origin";

// Next.js 16 calls this convention "proxy" (it was "middleware"). It runs before every /admin request.
//
// A session cookie only proves that a cookie exists. It can be expired or revoked on the server, and a
// logged-out browser can still hold an old one. So for /admin pages the proxy asks the API whether the
// session is real and redirects to the login page when it is not, before any admin page is sent.
// The API still enforces authorisation on every data request; this check only keeps logged-out users
// from seeing the admin pages.

const SESSION_COOKIES = ["portfolio_session", "__Host-portfolio_session"];

type SessionCheck = "admin" | "not-admin" | "unknown";

async function checkSession(cookieHeader: string): Promise<SessionCheck> {
  try {
    const res = await fetch(`${apiOrigin()}/api/auth/me`, {
      headers: { cookie: cookieHeader },
      signal: AbortSignal.timeout(8000),
    });
    // Only the API saying "not signed in" counts as signed out.
    if (res.status === 401 || res.status === 403) return "not-admin";
    // A slow or failing API says nothing about the session (a busy server must not log the owner out).
    if (!res.ok) return "unknown";

    const me = await res.json();
    return Boolean(me?.isAdmin) || me?.role === "Admin" || me?.role === "SuperAdmin" ? "admin" : "not-admin";
  } catch {
    return "unknown";
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // There is one sign-in page for everyone, /login. The old admin address just points there.
  if (pathname === "/admin/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const toLogin = () => {
    const loginUrl = new URL("/login", request.url);
    // Keep the page (and its filters) so signing in lands the admin back where they were.
    loginUrl.searchParams.set("from", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  };

  const hasSessionCookie = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasSessionCookie) {
    return toLogin();
  }

  // Forward the browser's cookies so the API can recognise the session.
  // When the API could not be asked, let the request through: the admin pages show only a loading screen until the
  // browser confirms the session, and the API still checks every data request.
  const session = await checkSession(request.headers.get("cookie") ?? "");
  return session === "not-admin" ? toLogin() : NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

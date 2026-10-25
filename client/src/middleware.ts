import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie =
    request.cookies.has("portfolio_session") ||
    request.cookies.has("__Host-portfolio_session");

  // 1. If user is already authenticated and visits /admin/login, redirect to /admin
  if (pathname === "/admin/login") {
    if (hasSessionCookie) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // 2. If user is accessing protected /admin/* routes without a session cookie, redirect to /admin/login
  if (pathname.startsWith("/admin") && !hasSessionCookie) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

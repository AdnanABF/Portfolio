/**
 * Where the API lives, as seen by the Next.js server. This is the only API address the app has.
 *
 * The browser never uses it: browser code calls relative paths such as /api/auth/login on the website's own address,
 * and next.config.ts forwards /api/* and /media/* here. The server itself uses it to load the home page data, check
 * the admin session (proxy.ts) and send the contact form. Set INTERNAL_API_URL in every environment; the local
 * default is the API started with `dotnet run`.
 */
export function apiOrigin(): string {
  return (process.env.INTERNAL_API_URL || "http://localhost:5065").replace(/\/$/, "");
}

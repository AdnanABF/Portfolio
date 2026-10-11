# Server — Reserved Placeholder

This folder is intentionally empty. It reserves the monorepo boundary for a
future standalone backend API (e.g. NestJS / .NET / Express).

## Boundary rules

- `client/` (Next.js App Router) must stay self-deployable to Vercel today.
- `client/` must NEVER import from `../server`.
- All backend access from the client goes through `client/lib/api-client.ts`,
  which uses `NEXT_PUBLIC_API_URL` when set, otherwise falls back to internal
  Next.js Server Actions.
- When this folder gains a real API, only env vars + DTOs change — no
  component rewrites.

## Planned API contract (v1)

When implemented, the server MUST match this contract so the client can swap
with a one-line env change:

### `POST /api/contact` → `201`

Request:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "Freelance project",
  "message": "Hello, at least 10 chars..."
}
```

Responses:

- `201 { "ok": true }` — accepted, emails queued
- `400 { "ok": false, "error": "validation_failed" }`
- `429 { "ok": false, "error": "rate_limited" }`

Server responsibilities: zod validation, honeypot field, rate limit
(3/hour + 30s cooldown per IP), send owner notification + sender auto-reply
via Resend.

### `GET /api/projects` → `200`

```json
[{ "id": "p1", "slug": "viralippurath-family", "title": "..." }]
```

### `GET /api/posts` → `200` (blog, future)

Same shape as projects with `slug`, `title`, `excerpt`, `publishedAt`.

## Suggested stack (not decided)

- NestJS + TypeScript + zod + Resend, or ASP.NET Core Minimal API.
- Deploy separately (e.g. Railway / Azure App Service), set
  `NEXT_PUBLIC_API_URL=https://api.example.com` in `client/.env`.

## Status

`TODO`: no code yet. See `client/lib/actions.ts` (Server Action stub) as the
temporary implementation until this service exists.

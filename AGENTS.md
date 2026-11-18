# Portfolio Web

Personal portfolio site with an admin CMS for Adnan Bin Farook. Monorepo: a Next.js website and a .NET API backed by PostgreSQL.

Shared agent rules live in `.agents/rules/` (Antigravity loads them directly, opencode through `opencode.json`, Claude Code through `CLAUDE.md`).

- Session status is in `.agents/rules/current-status.md`. It is git-ignored and local only, so on a fresh clone create it with the same frontmatter as the other rule files.
- Start opencode from the repo root. Started inside `client/`, it reads `client/AGENTS.md` instead of this file.

## Layout

```text
client/                         Next.js 16 App Router, React 19, Tailwind CSS v4, TypeScript (strict)
  src/app/                      routes (public site, /admin, account pages, blog, projects)
  src/components/<area>/        UI by area: site, sections, bento, admin, account, ui, effects
  src/lib/                      API client, server actions, shared types
  src/proxy.ts                  guards /admin (Next.js 16 name for middleware)
  content/blog/*.mdx            blog posts
server/Portfolio.API/           ASP.NET Core (.NET 10) Web API
  Features/<Domain>/            vertical slices (Auth, Projects, Skills, Homepage, Media, Users, ...)
  Core/Data/                    AppDbContext, seeders, Migrations/
  Core/Entities/                EF Core entities
  Infrastructure/               email (Resend), logging, exception handling, caching, extensions
server/Portfolio.API.IntegrationTests/   xUnit integration tests (real PostgreSQL)
.github/workflows/              CI on PRs; Coolify deploys for staging and production
```

## How the website talks to the API

The browser calls only the website's own `/api/...` and `/media/...`. `client/next.config.ts` rewrites those to `INTERNAL_API_URL` (default `http://localhost:5065`), so the session cookie (ASP.NET Core Identity) belongs to the website. The Next.js server also calls the API directly for page data and the admin check. Endpoints, roles and settings are documented in `README.md` and `server/README.md`. Read those instead of guessing.

## Commands

| What | Where | Command |
|---|---|---|
| Install | `client/` | `npm ci` |
| Dev server (port 3000) | `client/` | `npm run dev` |
| Lint | `client/` | `npm run lint` |
| Build + type-check | `client/` | `npm run build` |
| Run built site | `client/` | `npm run start` |
| Regenerate icons/assets | `client/` | `npm run generate:assets` |
| Run API (port 5065) | `server/Portfolio.API/` | `dotnet run` |
| Build API + tests | repo root | `dotnet build server/Portfolio.API.slnx` |
| Server tests | repo root | `dotnet test server/Portfolio.API.slnx` |
| New migration | repo root | `dotnet ef migrations add <Name> --project server/Portfolio.API --output-dir Core/Data/Migrations` |

- CI (`.github/workflows/ci.yml`) runs: `dotnet build` and `dotnet test` (Release), then `npm ci`, `npm run lint` and `npm run build`.
- Tests need PostgreSQL. They read `TEST_CONNECTION_STRING`, which defaults to `Host=localhost;Port=5432;Database=portfolio_test;Username=postgres;Password=postgres`. The tests migrate the database themselves.
- The API applies migrations on startup (`Core/Data/DbInitializer.cs`).
- `dotnet ef` is a global tool here (no tool manifest in the repo).

## Local setup

- Website: copy `client/.env.example` to `client/.env.local`.
- API: create `server/Portfolio.API/appsettings.Development.json` (git-ignored) to override `appsettings.json`: database, `Admin` owner account, `Resend`. With an empty Resend `ApiKey`, emails are written to the log instead of being sent.

## Branches and deploys

- `develop`: integration branch. Pushes deploy to staging (Coolify).
- `master`: production. Pushes deploy to production.
- CI runs on every PR into `develop` or `master`.

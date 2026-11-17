# Portfolio Web — Monorepo

Personal portfolio and dynamic CMS for Adnan Bin Farook.

## Structure

```text
Portfolio Web/
  client/  # Next.js 16 App Router frontend (React 19, Tailwind CSS v4; the home page is edited in the admin portal)
           # Self-contained via Dockerfile (Coolify).
  server/  # ASP.NET Core (.NET 10) Web API backend
           # Vertical Slice architecture across 11 feature domains, PostgreSQL,
           # ASP.NET Core Identity cookie auth, Output Caching, Serilog telemetry,
           # and email (contact messages + repo access requests) via Resend.
```

## Branching & Workflow

- `master` — stable releases (production)
- `develop` — integration branch (staging deployment)
- `feature/*` — active work, branched from `develop`

## How the website talks to the API

The browser only calls the website's own address (`/api/...` and `/media/...`). The Next.js server forwards those calls to the API, so the login cookie belongs to the website and the `/admin` check can see it. The server also uses the API directly to load the home page data and check the admin session. One setting, `INTERNAL_API_URL`, says where the API is.

```text
Browser ──► website /api/...  ──(Next.js forwards, INTERNAL_API_URL)──► API ──► PostgreSQL
Website server ───────────────(page data, admin check)────────────────► API
```

## Configuration

Settings are environment variables. Each deployable folder has an example file with every setting and an explanation:

- `client/.env.example`: the website (`INTERNAL_API_URL`, the API address, and `NEXT_PUBLIC_SITE_URL`, its own public address; any address other than `https://adnanbinfarook.com` is marked `noindex`).
- `server/.env.example`: the API (database, owner account, email, public address, proxies and more).
- `server/Portfolio.API/appsettings.json`: the API's commented defaults. Local overrides go in `appsettings.Development.json`, which is git-ignored (never committed).

Never commit real passwords or API keys.

## Quick Start

### Frontend (Next.js)

```powershell
cd client
npm install
npm run dev   # uses the API at http://localhost:5065 unless INTERNAL_API_URL is set (see client/.env.example)
```

### Backend (.NET 10 API)

```powershell
cd server/Portfolio.API
dotnet run    # needs appsettings.Development.json (see server/README.md)
```

# Portfolio Web — Monorepo

Personal portfolio and dynamic CMS for Adnan Bin Farook.

## Structure

```text
Portfolio Web/
  client/  # Next.js 16 App Router frontend (React 19, Tailwind CSS v4, In-Context CMS)
           # Self-contained via Dockerfile (Coolify).
  server/  # ASP.NET Core (.NET 10) Web API backend
           # Vertical Slice architecture across 11 feature domains, PostgreSQL,
           # ASP.NET Core Identity cookie auth, Output Caching, and Serilog telemetry.
```

## Branching & Workflow

- `master` — stable releases (production)
- `develop` — integration branch (staging deployment)
- `feature/*` — active work, branched from `develop`

## Quick Start

### Frontend (Next.js)

```powershell
cd client
npm install
npm run dev
```

### Backend (.NET 10 API)

```powershell
cd server/Portfolio.API
dotnet run
```

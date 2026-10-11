# Portfolio Web — Monorepo

Personal portfolio for Adnan Bin Farook.

## Structure

```text
Portfolio Web/
  client/  # Next.js 15 App Router frontend (light-first + dark toggle)
           # Self-deployable to Vercel. See client/README.md
  server/  # RESERVED placeholder for future standalone backend API
           # Currently empty. See server/README.md for API contract
```

## Branching

- `master` — stable releases only
- `develop` — integration branch (receives PRs)
- `feature/*` — active work, branched from `develop`
  - Current: `feature/nextjs-migration` (Vite SPA → Next.js rewrite)

## Quick start

```powershell
# Frontend (works today, no backend needed)
cd client
npm install
npm run dev
```

Backend (`server/`) is not implemented yet. The client uses internal
Next.js Server Actions until `NEXT_PUBLIC_API_URL` points to a real API.
See `server/README.md`.

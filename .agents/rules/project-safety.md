---
trigger: always_on
---

# Project Safety

## Never touch
- Migrations already in `server/Portfolio.API/Core/Data/Migrations/` (including `AppDbContextModelSnapshot.cs`, except through `dotnet ef`). To change the schema, add a new migration with `dotnet ef migrations add`.
- `client/AGENTS.md`: `next dev` writes it. Read it, never edit it.
- `.github/workflows/*`: only change these when asked.
- Generated output: `client/.next/`, `client/next-env.d.ts`, `bin/`, `obj/`, `.vs/`.

## Secrets
- NEVER write a real password, API key, token or connection string into a tracked file. Use the placeholders already in `client/.env.example`, `server/.env.example` and `server/Portfolio.API/appsettings.json`.
- Local values belong only in `client/.env.local` and `server/Portfolio.API/appsettings.Development.json`, both git-ignored. Do not print their contents in chat.

## Code comments
- Write comments in plain English that explain why, not what (both `client/` and `server/`).

## Keep docs in step with the code
- When you add or change an endpoint, a query option, a role rule or an email, update `server/README.md` in the same branch.
- When you add or change a setting, update `server/.env.example` and `appsettings.json` (API) or `client/.env.example` (website). Update `README.md` if the setup steps change.

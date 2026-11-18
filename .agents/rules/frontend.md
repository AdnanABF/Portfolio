---
trigger: glob
globs: client/**
---

# Frontend Conventions (client/, Next.js 16)

## Before writing Next.js code
- Read `client/AGENTS.md` and follow it. This Next.js version differs from older training data: the docs are in `client/node_modules/next/dist/docs/`, and middleware is now `src/proxy.ts`. Cache Components are on (`cacheComponents: true`).

## Structure
- New UI goes in a component under `src/components/<area>/` (`site`, `sections`, `bento`, `admin`, `account`, `ui`, `effects`). A route file in `src/app/**/page.tsx` renders it.
- Some existing pages keep their data loading in the page file (`resume`, `projects/[slug]`, `blog`). That is fine; don't move it unless asked.
- Reuse the primitives in `src/components/ui/` (Button, Card, Modal, FormField, ...) before writing new ones.
- Import with the `@/` alias (maps to `src/`).
- Shared types live in `src/lib/types.ts`.

## Talking to the API
- Browser code calls same-origin paths (`/api/...`, `/media/...`) through `src/lib/api-client.ts`. Never hard-code the API host.
- Handle failures through `ApiError`: `status`, `fieldErrors` (show these next to inputs) and `code`.
- Server-side code reaches the API through `apiOrigin()` (`src/lib/api-origin.ts`). Server actions live in `src/lib/*actions.ts` with `"use server"`.

## Forms and styling
- Every form uses `react-hook-form` with a `zod` schema. `ContactForm.tsx` with `src/lib/contact.ts` is the reference.
- Several forms still use plain React state: `LoginForm`, `SignUpForm`, `AccountPage`, `LinkPages`, `MemberFormModal`. When you change one of them, convert it to react-hook-form + zod in the same branch.
- Style with Tailwind CSS v4 classes. Global styles live only in `src/app/globals.css`.

## Checks
- There are no client unit tests. Before handing work back, run `npm run lint` and `npm run build` in `client/`. The build also type-checks.

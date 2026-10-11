> ⚠️ **DEPRECATED / DISCONTINUED — Archived v1. Do not build on this branch.**
> Active rewrite: `feature/nextjs-migration` → `develop` (Next.js App Router + light UI).
> This branch freezes the last working Vite SPA for reference only.

# Portfolio v1 (Vite SPA — Archived)

Personal portfolio of Adnan Bin Farook. Client-only single-page static site.

## Tech stack

- **React 19 + TypeScript 5.9 + Vite 7** (`client/`, `@vitejs/plugin-react`)
- **Tailwind CSS v4** (`@tailwindcss/vite`, `@theme` tokens in `src/index.css`)
- **Framer Motion 12** (reveals, modals), **Lucide React** (icons)
- **React Hook Form** + **EmailJS browser SDK** (contact form, client-side send)
- No backend, router, or store — content hardcoded in `src/constants.ts`
  (`NAV_ITEMS`, `SKILLS`, `EXPERIENCE`, `PROJECTS`), sections in
  `src/components/*` (Hero, About, ExperienceTimeline, SkillsGrid,
  Projects, Contact, Navbar, Footer)
- Static deploy (Vercel `dist/`), SEO via `index.html` +
  `public/robots.txt, sitemap.xml, og-image.png`

## Run it

```powershell
cd client
npm install
npm run dev     # vite
npm run build   # tsc -b && vite build
```

## Migration note

v1 is frozen here as of Oct 2026. Current work continues on
`feature/nextjs-migration` (Next.js 15, light-first + dark toggle,
`client/` + reserved `server/` split). See that branch for the future.

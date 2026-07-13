# Crochette

Handmade-crochet e-commerce storefront: a fixed product catalog plus a custom-order intake pipeline. Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion, and Postgres via Drizzle ORM.

## Stack

- **Framework**: Next.js 16 (Turbopack) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4, `next/font` (Cormorant Garamond + Work Sans)
- **Animation**: Framer Motion — lightweight, transform/opacity-only, `prefers-reduced-motion`-aware (`components/motion/`)
- **Database**: PostgreSQL (Supabase) via Drizzle ORM (`lib/db/`)
- **Validation**: Zod, used in the custom-order and contact Server Actions

## Getting started

```bash
npm install
```

Copy `.env.example` to `.env.local` and set `DATABASE_URL` to a Postgres connection string (Neon or Supabase both work):

```bash
cp .env.example .env.local
```

Apply the schema and seed the product catalog:

```bash
npm run db:migrate
npm run db:seed
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:studio` | Open Drizzle Studio against `DATABASE_URL` |
| `npm run db:seed` | Seed the `products` table from `lib/data/products.ts` |

## Project structure

```
/app
  /               landing page
  /shop           product catalog (filterable grid)
  /gallery        image gallery
  /about          studio/values page
  /custom         custom-order intake form (Server Action -> Postgres)
  /contact        contact form (Server Action -> Postgres)
/components
  /motion         FadeIn, Float, PageTransition — Framer Motion islands
  /sections       Nav, Footer
  /ui, /shop, /custom, /contact   page-specific components
/lib
  /data           typed mock/catalog data
  /db             Drizzle schema, client, seed script
  /validation     Zod schemas for form input
/drizzle          generated SQL migrations
```

## Status

Foundation and initial Phase 1 slice are in place: full design-matched storefront, live Postgres-backed custom-order and contact forms, lightweight page transitions. Not yet wired: product catalog reading from the DB (still mock data), cart/checkout (Stripe), confirmation emails, custom-order photo upload, and an admin dashboard. See `Cro_Documentation.md` for the full architecture/phase plan.

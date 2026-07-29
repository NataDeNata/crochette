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
| `npm run test` | Every test (unit + integration) |
| `npm run test:unit` | Unit tests only — no database, no network |
| `npm run test:integration` | Integration tests — requires the test database below |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run db:test:up` | Start the throwaway test Postgres (needs Docker) |
| `npm run db:test:down` | Stop and destroy it |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:studio` | Open Drizzle Studio against `DATABASE_URL` |
| `npm run db:seed` | Seed the `products` table from `lib/data/products.ts` |

## Testing

Vitest, in two projects.

**Unit** (`tests/unit/`) covers pure logic — the Sentry PII scrubbers, the
Postgres error discriminator, the cart store's optimistic/debounce behaviour,
the Zod schemas, email templates. No database, no network:

```bash
npm run test:unit
```

**Integration** (`tests/integration/`) runs against a real Postgres, because
most of what it covers only exists in SQL: the cart's `LEAST`/`GREATEST` clamps,
the webhook's row-locking idempotency, `lowStockCondition`. It needs Docker:

```bash
npm run db:test:up      # postgres:17 on 55432, data in tmpfs
npm run test:integration
npm run db:test:down
```

Migrations from `drizzle/` are applied automatically on the first run, so the
schema under test is the schema production runs.

**The suite cannot touch a real database.** It loads `.env.test` and only
`.env.test` — never `.env.local`, which holds the live Supabase, Xendit, Resend
and Upstash credentials — and `tests/setup/env.ts` refuses to connect unless the
host is loopback and the database name ends in `_test`. Integration tests
`TRUNCATE` every table between cases, so that check is what makes them safe;
it has its own tests in `tests/unit/setup/safety-rail.test.ts`.

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
/tests
  /unit           pure logic, no database
  /integration    real Postgres, TRUNCATE between tests
  /setup          env loading, the disposable-database guard, migrations
  /fixtures       case tables shared between the two projects
```

## Status

Foundation and initial Phase 1 slice are in place: full design-matched storefront, live Postgres-backed custom-order and contact forms, lightweight page transitions. Not yet wired: product catalog reading from the DB (still mock data), cart/checkout (Stripe), confirmation emails, custom-order photo upload, and an admin dashboard. See `Cro_Documentation.md` for the full architecture/phase plan.

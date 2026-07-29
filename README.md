# Crochette

Handmade-crochet e-commerce storefront: a fixed product catalog plus a custom-order intake pipeline. Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion, and Postgres via Drizzle ORM.

## Stack

- **Framework**: Next.js 16 (Turbopack) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix), `next/font` (Cormorant Garamond + Work Sans). Tailwind is the sole styling mechanism — no inline `style={{}}` outside Framer Motion's own animation API
- **Animation**: Framer Motion — transform/opacity-only, `prefers-reduced-motion`-aware (`components/motion/`)
- **Database**: PostgreSQL (Supabase) via Drizzle ORM (`lib/db/`)
- **Auth**: Auth.js v5 — one config, two Credentials providers (`admin`, `customer`) on a shared JWT session (`lib/auth.ts`)
- **Payments**: Xendit hosted checkout (Payment Sessions) — Stripe doesn't support PH-registered merchants (`lib/payments/xendit.ts`)
- **Storage**: Vercel Blob — product photos, gallery images, custom-order reference uploads
- **Email**: Resend — order, custom-order and contact notifications (`lib/email/`)
- **Rate limiting**: Upstash Redis (`lib/security/rate-limit.ts`)
- **Observability**: structured JSON logs to stdout, plus Sentry errors-only behind a DSN gate (`lib/observability/`)
- **Validation**: Zod, server-side in every Server Action; React Hook Form on the admin product/discount forms
- **Testing**: Vitest (unit + integration against a real Postgres), GitHub Actions CI

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

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request: lint,
`tsc --noEmit` and the unit tests in one job; the integration suite against a
`postgres:17` service container plus a production `next build` in the other.

**No job uses a repository secret.** This repository is public, so a workflow
that needed the real `DATABASE_URL` could not safely run on a pull request from
a fork — which is why CI brings its own throwaway database instead of borrowing
a real one.

`master` is protected: both checks must pass before a pull request can merge.

## Project structure

```
/app
  /(home)         landing page — route group so its loading.tsx covers only itself
  /shop           catalog grid and /shop/[slug] product pages
  /gallery        admin-curated gallery
  /about /contact /custom   marketing pages + the two public forms
  /cart /checkout /order/[id]   purchase flow
  /account        customer signup/login, order history, saved addresses
  /admin          role-gated dashboard: products, orders, custom orders,
                  discounts, product photos, gallery curation
  /api/webhooks/xendit   payment confirmation -> marks paid, decrements stock
/components
  /motion         FadeIn, Float, Lightbox, PageTransition — Framer Motion islands
  /sections       Nav, Footer
  /ui             shadcn primitives + ProductCard, GalleryTile, Skeleton
  /admin /account /cart /checkout /custom /shop   feature components
/lib
  /cart           Zustand store, signed cookie, cart resolution
  /db             Drizzle schema, client, inventory/discount/account helpers
  /email          Resend client and notification templates
  /observability  structured logger + Sentry scrubbers
  /payments       Xendit REST client
  /security       Upstash rate limiter
  /validation     Zod schemas, shared client- and server-side
/drizzle          generated SQL migrations
/tests
  /unit           pure logic, no database
  /integration    real Postgres, TRUNCATE between tests
  /setup          env loading, the disposable-database guard, migrations
  /fixtures       case tables shared between the two projects
```

## Status

**Phase 1 (MVP) is complete** and deployed on Vercel. The storefront sells the
catalog end to end — browse, cart, checkout, payment, confirmation — with a
custom-order intake pipeline, customer accounts, and an admin dashboard covering
products, orders, custom orders, discount codes, product photos and gallery
curation.

**Phase 2 (hardening)** is largely done: server-owned cart, overselling
prevention, low-stock alerts, order status/tracking emails, rate limiting,
structured logging + Sentry, and automated tests in CI. Discount codes and
multi-image product galleries were pulled forward from Phase 3.

Still open: abandoned-cart email reminders, and browser-level E2E tests.

**Deliberately on hold, not missing:** the site runs on the Vercel-assigned
domain as a showcase and does not take real payments yet. Going live needs a
custom domain, a verified Resend sending domain, and Xendit's live key with a
webhook registered against the production domain — see `Cro_Documentation.md`
§10, which also has the full architecture and phase plan.

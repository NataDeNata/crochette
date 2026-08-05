# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Crochette has **no single primary user** — this was confirmed, not defaulted. Three real audiences share the storefront and design decisions are made per surface rather than from one ranked persona:

- **Gift-buyers**, mostly Filipino and mostly on phones, arriving from a social link to buy a handmade piece for someone else. Price-aware, unlikely to create an account, and served by guest checkout as a first-class path rather than a fallback.
- **Craft enthusiasts and collectors**, who value handmade work and want to see materials, process and detail before buying. They are why real product photography and an owner-curated `/gallery` exist.
- **Commission customers**, who come for a bespoke piece rather than the catalog. For them the catalog is proof of capability and `/custom` is the product.

A fourth user is internal and just as real: **the studio owner**, the sole operator of `/admin`. She runs the entire back office by hand — products, orders, custom requests, gallery curation, discounts — on a single account protected by a TOTP second factor.

## Product Purpose

A handmade-crochet storefront for a single-owner studio. It exists so the owner can sell a real catalog with real payments, take custom commissions with reference photos, and run the whole business from one dashboard without engineering help. Success is an order the owner can fulfill and a commission conversation she can start, both without leaving the site.

## Positioning

The custom-order pipeline is the part a neighboring storefront template could not truthfully copy. `/custom` is a commission *experience* — tactile pickers for piece type, size, colors and budget, feeding a live request-preview panel that mirrors the customer's own words back at them before they submit. Everything else on the site is a competent shop; this is the mechanism.

## Operating Context

- **One studio, one operator.** Every admin surface is used by one person who knows the inventory personally. There are no roles, no teams, no approval flows.
- **Phones first, in practice.** Traffic arrives from social links. The storefront is verified down to 320px.
- **Philippines-only.** Prices are integer centavos (PHP), the same unit Xendit's API expects. Shipping is a flat ₱100. Reporting timezone is hardcoded `Asia/Manila`. International shipping and multi-currency are explicit non-goals.
- **Live as a demo, not yet transacting.** The site runs at `crochette-zeta.vercel.app` with real payments deliberately switched off pending a custom domain. That is a standing decision, not unfinished work.

## Capabilities and Constraints

**Confirmed functionality:** catalog with search/category/pagination; multi-image product galleries; server-owned cart with guest and account identities; guest checkout through Xendit hosted checkout; custom-order intake with up to 4 reference photos; contact form; optional customer accounts with Google sign-in; saved addresses; order history; discount codes; and a full admin dashboard covering products, orders, custom requests, gallery, discounts, customers and settings.

**Technical constraints future design work must respect:**

- **Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui on Radix.** Tailwind is the sole styling mechanism sitewide. Two inline styles are permanent and load-bearing: `ShopMarquee.tsx`'s `style={{ x }}` is a Framer `MotionValue` written imperatively outside React's render cycle and has no className form, and `RevenueChart.tsx`'s `--bar-h` is a continuous per-datum percentage. Removing either costs real behavior.
- **Server Components read Postgres directly; mutations are Server Actions.** There is no REST/GraphQL layer and no client data-fetching library.
- **The cart store starts empty and hydrates after first paint.** Any component branching on cart contents must branch on `loaded` first, or it renders "empty" as fact. Two pages shipped this bug.
- **Animation is transform/opacity only and `prefers-reduced-motion` aware.** Framer Motion is already in the stack.
- **`body { overflow-x: hidden }` is load-bearing** for the drag marquee, which means `documentElement.scrollWidth` cannot detect horizontal overflow here. Find offending elements directly instead.
- **No component-level test coverage.** Nothing in the project mounts React — no Playwright, no React Testing Library. A type-check, lint, 239 unit tests and a clean build have all passed over a component that rendered the wrong branch. Visual changes are verified by loading pages, or not at all.

**Explicitly undecided:** whether the storefront gets a dark theme. `next-themes` is a dependency and `globals.css` carries a full `.dark` block, but no `ThemeProvider` is mounted and nothing applies the class — the block is currently unreachable default shadcn gray with no relationship to the brand palette.

## Brand Commitments

- **Name:** Crochette. A single-owner handmade-crochet studio.
- **Palette:** a hand-tuned cream and terracotta family in oklch, defined as tokens in `app/globals.css`. `--brand` is the terracotta `oklch(0.55 0.09 20)`, deliberately distinct from `--primary`, which is the dark ink. This palette was chosen over an imported design system's darker colors specifically to keep the lighter landing-page feel.
- **Typography:** Cormorant (serif) for display, Work Sans (sans) for text.
- **Semantic token vocabulary is established and binding**: `brand` / `sage` / `warning` / `info` / `destructive`, each with a solid value plus a `-soft` / `-soft-foreground` pair for tinted badges. These replaced roughly forty hardcoded one-off `oklch(...)` literals across six admin files. New color must come from this vocabulary or extend it deliberately — not from arbitrary values at call sites.

## Evidence on Hand

- **Real product photography** exists and is in use; the `/gallery` is curated by the owner from real product images.
- **No customer testimonials, reviews, ratings, press, case studies or sales figures exist.** Reviews are an explicit v1 non-goal. Future design work must not fabricate social proof, star ratings, "X sold" counters, or customer quotes to fill a layout.
- **No live payment data.** The site has never processed a real payment, and no live Xendit webhook payload has ever been observed.

## Product Principles

1. **The client is never trusted with money or contents.** Checkout re-reads the cart from the database and re-prices every line server-side. No design change may move pricing, totals or line items into client-submitted state.
2. **Guest checkout is first-class.** Accounts are optional on top of it. No flow may make an account feel required to buy.
3. **The owner has to be able to operate it by hand.** Every admin surface is judged on whether one person can run the studio from it, not on how much it displays.
4. **Say only what is true.** No fabricated proof, no invented counts, and no success message that claims more than the operation actually did — a bulk action that changed nothing must not report changes.
5. **A comment describing intent is not the behavior.** Where prose and code disagree, the code is what runs. Design documentation here is held to the same standard.

## Accessibility & Inclusion

**WCAG 2.2 AA is binding.** 4.5:1 for body text, 3:1 for large text and UI boundaries. Where a brand token fails, the token is adjusted rather than excused. The current cream/terracotta palette has never been measured against this bar, so failures are expected on first audit.

Already in place and not to be regressed: 44px minimum touch targets, `prefers-reduced-motion` handling on all animation, Radix primitives supplying focus-trap/ESC/scroll-lock behavior, and layout verified to 320px.

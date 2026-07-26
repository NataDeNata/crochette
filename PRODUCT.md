# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences:
- **End customers** browsing and buying a fixed catalog of handmade crochet decor and amigurumi (bears, flowers, baskets, plush characters), and separately submitting structured custom-order requests (size, colors, character, reference photos, budget) for the studio to quote and hand-produce.
- **The studio owner**, who is also the sole admin: manages the product catalog, reviews and quotes custom-order requests, and fulfills orders through a single-login `/admin` dashboard, without needing to touch code for day-to-day operation.

## Product Purpose

A direct-to-consumer storefront for a solo/small handmade-crochet studio: sell a fixed catalog of ready-made pieces via standard cart/checkout, and run a separate custom-order pipeline (intake → manual quote → payment → hand production → fulfillment). Success means real online sales the owner can operate without code, plus a working, owned custom-order pipeline — not a generic "handmade" claim alone.

## Positioning

The differentiator is the custom-order commission process itself, not "handmade" as a category claim: a real structured intake form, a real human (the studio owner) reviewing photos/specs and setting a quote, and genuine one-person hand production — a mechanism a generic handmade-goods marketplace listing doesn't offer.

## Operating Context

The studio owner personally reviews custom-order requests and reference photos in `/admin/custom-orders`, sets quoted prices and internal notes, and manually fulfills orders (no warehouse/logistics team — single owner). Payments settle to a Philippines bank account via Xendit. The site is currently deliberately in "showcase/demo" mode on its Vercel-assigned domain — real purchases are intentionally paused pending a custom domain, a verified Resend sending domain, and Xendit live keys, until the owner explicitly triggers go-live.

## Capabilities and Constraints

- Next.js 16 (App Router) storefront + `/admin` dashboard + `/account` customer area, Postgres (Supabase) via Drizzle.
- Guest checkout is the default, zero-friction path; customer accounts (email/password, no OAuth yet) are additive, not a replacement.
- Payments via **Xendit**, not Stripe/PayMongo — Stripe doesn't support Philippines-registered merchant accounts; Xendit also accepts international/foreign cards while settling in PHP.
- Discount/coupon codes and stock-overselling prevention (decrement on confirmed payment only, clamped at 0) are live.
- Rate limiting is partial: customer login/signup only, in-memory (not yet Redis-backed, not yet covering admin login/checkout/custom-order/contact forms).
- Confirmation emails (order, custom-order, contact, welcome) are wired via Resend but cannot reach real customer inboxes until a sending domain is verified — a known, accepted gap, not a bug.
- Custom-order reference photo uploads (up to 4, JPG/PNG/WebP, 5MB each) go to Vercel Blob.

## Brand Commitments

Name: **Crochette**. Soft, warm, editorial aesthetic — Cormorant Garamond serif + Work Sans sans-serif, a cream/terracotta oklch color palette. Existing landing-page tone is quiet and handmade-feeling rather than loud or aggressively salesy.

## Evidence on Hand

A real seed catalog of ~10 products with real PHP pricing (₱380–₱1200 range) is live in the database. Landing-page hero/about/gallery-teaser imagery uses real stock photography (Unsplash) as a stand-in pending real studio photography. The full `/shop` catalog grid and the dedicated `/gallery` page still show placeholder color-block art, not real photos — future work must not assume real product photography exists there yet.

## Product Principles

1. Guest checkout must never regress — it is the primary path, not a fallback.
2. The studio owner must never need to touch code for routine catalog, order, or discount management.
3. Custom orders are a deliberately manual, human-reviewed workflow — do not over-automate the quoting step.
4. Real payments/emails stay off until the owner explicitly triggers go-live; do not push toward buying a domain or flipping to Xendit live keys unasked.
5. Warm, handmade, editorial feel over generic e-commerce templating.

## Accessibility & Inclusion

No formal accessibility standard has been mandated. Past work has included a manual keyboard/screen-reader pass on checkout and forms, plus automated axe-style checks as ad hoc QA — treat as a baseline expectation, not yet a documented requirement.

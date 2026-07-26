---
name: Crochette
description: A direct-to-consumer handmade crochet storefront with a real custom-order commission pipeline.
colors:
  cream-paper: "oklch(0.975 0.012 85)"
  card-cream: "oklch(0.98 0.01 85)"
  ink-brown: "oklch(0.28 0.02 60)"
  muted-ink: "oklch(0.5 0.02 60)"
  warm-sand: "oklch(0.92 0.025 75)"
  soft-linen: "oklch(0.95 0.015 75)"
  dusty-rose: "oklch(0.9 0.045 20)"
  accent-ink: "oklch(0.4 0.05 20)"
  terracotta: "oklch(0.55 0.09 20)"
  terracotta-deep: "oklch(0.45 0.1 20)"
  clay-border: "oklch(0.85 0.02 60)"
  focus-ring: "oklch(0.7 0.06 20)"
  alert-red: "oklch(0.55 0.18 25)"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(2.5rem, 4.5vw, 3.625rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "normal"
  body:
    fontFamily: "Work Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
  label:
    fontFamily: "Work Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "0.45rem"
  md: "0.6rem"
  lg: "0.75rem"
  xl: "1.05rem"
  2xl: "1.35rem"
  3xl: "1.65rem"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.ink-brown}"
    textColor: "{colors.cream-paper}"
    rounded: "{rounded.full}"
    padding: "14px 30px"
  button-primary-hover:
    backgroundColor: "oklch(0.34 0.03 60)"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-brown}"
    rounded: "{rounded.full}"
    padding: "14px 30px"
  button-outline-hover:
    backgroundColor: "oklch(0.28 0.02 60 / 0.06)"
---

# Design System: Crochette

## Overview

**Creative North Star: "The Studio Table"**

Crochette reads like a small studio's own table, not a marketplace template: warm cream paper, soft dusty-rose and terracotta accents, and generous editorial serif headlines that feel handwritten-adjacent rather than corporate. Density is low and unhurried — pages breathe, imagery leads, and the terracotta accent is used sparingly enough that it still reads as a signature rather than a system color. Confirmed visual rejection: no aggressive/loud SaaS-dashboard energy anywhere on the storefront; the admin surface is explicitly allowed to be plainer and more utilitarian since it's internal-only and functional-priority, not brand-priority (see PRODUCT.md).

The system runs on two deliberately different implementation modes for two deliberately different jobs — this is a structural fact of the codebase, not a stylistic inconsistency to fix (see **Do's and Don'ts**):
- **Storefront/marketing chrome** (landing page, Nav, Footer, product/gallery pages) is hand-authored with inline styles for its base look, plus a small set of dedicated CSS classes for anything that needs a `:hover`/`:focus-visible` state.
- **Admin CRUD surfaces** (`/admin` product/discount/order management) are pure Tailwind classes composed from shadcn/ui primitives (`radix-nova` style preset).

**Key Characteristics:**
- Warm cream background, near-black-brown ink text (never pure black)
- Cormorant Garamond serif display type paired with Work Sans body type
- Fully pill-shaped (rounded-full) buttons everywhere
- Terracotta as a rare, signature accent — not a workhorse UI color
- Flat by default; no drop shadows as a resting state
- Framer Motion used only for transform/opacity, always `prefers-reduced-motion`-aware

## Colors

A warm neutral cream/brown base carries the page; a single terracotta accent is used sparingly for links, active states, and small signature moments.

### Primary
- **Ink Brown** (`oklch(0.28 0.02 60)`): primary text color, primary button background, and the `--foreground`/`--primary` shadcn token. This is the system's "dark" color — never pure black.

### Secondary
- **Warm Sand** (`oklch(0.92 0.025 75)`): secondary surfaces — cart icon background, secondary button fill, sidebar accent.
- **Soft Linen** (`oklch(0.95 0.015 75)`): muted backgrounds, one step lighter than Warm Sand.

### Tertiary
- **Dusty Rose** (`oklch(0.9 0.045 20)`): the `--accent` token; used for soft accent cards (e.g. the custom-order CTA card) and light accent fills.
- **Terracotta** (`oklch(0.55 0.09 20)`): the signature accent — link color, active-nav-link color, `--chart-1`. Used deliberately rarely.
- **Terracotta Deep** (`oklch(0.45 0.1 20)`): link/terracotta hover state, one step darker.

### Neutral
- **Cream Paper** (`oklch(0.975 0.012 85)`): page background (`--background`).
- **Card Cream** (`oklch(0.98 0.01 85)`): card/popover surfaces, one step lighter/warmer than the page background so cards read as slightly lifted without a shadow.
- **Muted Ink** (`oklch(0.5 0.02 60)`): secondary/muted text (`--muted-foreground`).
- **Clay Border** (`oklch(0.85 0.02 60)`): the only border/divider/input-stroke color in the system (`--border`, `--input`).
- **Focus Ring** (`oklch(0.7 0.06 20)`): the universal focus-visible outline/ring color — a warm terracotta-family tone, not a generic blue.
- **Alert Red** (`oklch(0.55 0.18 25)`): destructive actions/errors only (`--destructive`).

### Named Rules
**The Rare Accent Rule.** Terracotta (`oklch(0.55 0.09 20)`) is reserved for links, the active nav-link indicator, and small signature moments. It is not a background color, not a button-fill color, and should never appear on more than one or two elements in a single viewport.

**The Warm-Neutral-Only Rule.** Every neutral in this system (background, card, border, muted text) carries the same warm brown/cream hue family (oklch hue ≈ 60-85). Do not introduce a cool gray — that is shadcn's default neutral palette, which this project explicitly overrides project-wide (see `:root` in `app/globals.css`).

## Typography

**Display Font:** Cormorant Garamond (with Georgia, serif fallback)
**Body Font:** Work Sans (with ui-sans-serif, system-ui, sans-serif fallback)

**Character:** An editorial pairing — a soft, classical serif for headlines against a clean, quiet grotesque for body copy and UI text. Both fonts are self-hosted via `next/font` (no runtime Google Fonts request).

### Hierarchy
- **Display** (weight 500, `clamp(2.5rem, 4.5vw, 3.625rem)` / 40–58px, line-height ~1.1): section and hero headlines. Cormorant Garamond only — never used for body or UI text.
- **Title** (weight 500, 36–40px, Cormorant Garamond): sub-section headings (e.g. "Have something in mind?", About/Gallery/Custom-order section titles).
- **Body** (weight 400, 16px, line-height 1.7, Work Sans): paragraph copy. Line-height is deliberately generous for the editorial, unhurried feel.
- **Label** (weight 500, 13px, Work Sans): eyebrows, nav links, small UI labels — often paired with a muted or terracotta color.

### Named Rules
**The Serif-For-Headlines-Only Rule.** Cormorant Garamond never appears in body copy, buttons, or form inputs — it is reserved for headline-weight moments (h1/h2-equivalents), keeping the pairing legible rather than precious.

## Layout

Storefront sections use a full-bleed outer shell (the site was fixed to remove a legacy sitewide `max-width: 1440px` wrapper that was preventing Nav/Footer/the shop marquee from reaching true viewport edges) with inner content wrappers capped around 1200–1376px so text and cards stay readable on ultra-wide screens while backgrounds/chrome stay edge-to-edge. Responsive breakpoints are ad hoc per-component (not a shared token scale): `480px`, `640px`, `760px`, `860px` recur across `.gallery-grid`, `.footer-grid`, `.hero-grid`, and the nav's mobile-hamburger switch. The admin surface uses a simpler, denser, single-column-friendly layout appropriate to an internal tool.

## Elevation & Depth

Flat by default — no drop shadows as a resting state anywhere in the system. Depth is conveyed through subtle background-color steps instead (Card Cream sits one step lighter/warmer than Cream Paper; Warm Sand sits one step darker). The one place shadows appear is as a hover-state response on solid/outline buttons (see Components), never as an ambient resting effect.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. A shadow may appear only as a direct response to interaction state (button hover), never as a static "floating card" effect.

## Shapes

Buttons and pill-shaped chips/badges use a fully rounded `rounded-full` (9999px) silhouette — this is the system's signature form language. Cards and containers use the shared `--radius` scale (12px base, stepping from `sm` ≈7px to `3xl` ≈26px) rather than pill shapes. Borders are thin (1–1.5px) and always Clay Border colored; there is no heavy-border or outlined-box aesthetic anywhere.

## Components

`components/ui/` is **not uniform** — most files are genuine shadcn/ui primitives (button, card, dialog, select, table, input, field, alert-dialog, sonner, etc.) and should be treated as canonical, reusable, and shadcn-convention-following. `GalleryTile.tsx`, `PillGroup.tsx`, and `ProductCard.tsx` are hand-rolled, project-specific components that happen to live in the same folder — do not assume they follow shadcn conventions or "fix" them to match shadcn structure without being asked.

### Buttons
- **Shape:** fully rounded pill (`rounded-full`, 9999px), never a rectangular or slightly-rounded button anywhere in the system.
- **Primary:** Ink Brown background, Cream Paper text, `14px 30px` padding at the default `lg` size (also has `sm`/`md`/`xs`/icon sizes). Hover darkens the background one step (`oklch(0.34 0.03 60)`) and adds a soft directional shadow; a 1px `translateY` lift is applied under `motion-safe`.
- **Outline:** transparent background, 1.5px Ink Brown border, Ink Brown text. Hover tints the background with a 6% Ink Brown wash and darkens the border.
- **Hover / Focus:** all button variants use `focus-visible:outline-2` in the Focus Ring color; the lift/scale motion is wrapped in `motion-safe` so `prefers-reduced-motion` users get only the color/shadow feedback, never the transform.

### Cards / Containers
- **Corner Style:** the shared radius scale (12–26px depending on prominence); the custom-order CTA card specifically uses a larger, more generous radius (36px) as a deliberate one-off for its "floating card" role.
- **Background:** Card Cream, one step lighter/warmer than the page background.
- **Shadow Strategy:** none at rest (see Elevation & Depth).
- **Border:** thin Clay Border stroke, used sparingly — many cards rely on the background-color step alone rather than a border.

### Inputs / Fields
- **Style:** Clay Border stroke, Cream/Card Cream background, radius from the shared scale.
- **Focus:** a 2px Focus Ring outline with 1px offset — the same warm terracotta-family ring used on buttons, not a generic browser-default blue.

### Navigation
- **Style:** Work Sans label-weight links. Default color is Ink Brown; the active route and hover both shift to Terracotta.
- **The Conditional-Inline-Override idiom (protect this exactly):** nav links use `className="nav-link"` (which owns the default/hover color via `.nav-link:hover`/`:focus-visible` CSS rules) **plus** an inline `style={{ color: isActive ? ACTIVE_COLOR : undefined }}` for the active-route state only, deliberately falling back to `undefined` so the CSS class governs every other state. This is intentional and fragile — removing the `undefined` fallback previously broke the nav's default/hover color entirely (a real regression). Never simplify this to "just use the class" or "just use inline" — it needs both, in this exact shape.
- **Mobile treatment:** a hamburger menu below 860px, replacing the desktop inline link row entirely (`.nav-desktop-links`/`.nav-hamburger-btn` display toggle).

## Do's and Don'ts

### Do:
- **Do** treat `app/globals.css`'s inline-style-vs-CSS-specificity rule as load-bearing: inline styles beat class-based rules for the same CSS property even under `:hover`/`:focus-visible` (a pseudo-class doesn't raise specificity above inline). A component that sets a property inline for its base look must not rely on a class alone to change that same property on hover — either handle the hover case inline/via JS state too, or move the property fully to a CSS class (as `.nav-link`, `.footer-link`, `.cart-icon-link` already do). Never split one property inconsistently between the two.
- **Do** keep storefront/marketing chrome (`app/page.tsx`, `components/sections/Nav.tsx`, `components/sections/Footer.tsx`, `app/admin/layout.tsx`) in its existing inline-style-plus-hover-classes mode, and keep admin CRUD forms (`components/admin/*`, built on shadcn) in their existing pure-Tailwind mode. These are two intentional systems for two different jobs, not one system with drift.
- **Do** treat the oklch tokens in `:root` (`app/globals.css`) as the single source of truth for color — they intentionally override shadcn's default neutral-gray theme project-wide.
- **Do** keep Framer Motion animations transform/opacity-only, `prefers-reduced-motion`-aware, and running once (no replay on repeat scroll), matching every existing animated component in `components/motion/`.

### Don't:
- **Don't** migrate inline-styled storefront/marketing pages to Tailwind/shadcn classes as a side effect of a general polish, audit, or "consistency" pass. A full architectural migration to one system was already proposed and deliberately rejected as out of scope for MVP iteration — any such recommendation must be surfaced as a proposal for human review, not applied automatically.
- **Don't** "clean up" the nav-link conditional-inline-override idiom (see Components → Navigation) by removing the `style={{ color: ... : undefined }}` fallback or converting it to a pure CSS-class approach — this exact pattern previously caused a real regression when simplified.
- **Don't** treat `components/ui/GalleryTile.tsx`, `PillGroup.tsx`, or `ProductCard.tsx` as non-conforming shadcn primitives that need to be restructured to match the folder's other (genuinely shadcn) files.
- **Don't** apply visual "polish" to the `/admin` dashboard as brand-priority work — it is intentionally plainer and functional-priority (see PRODUCT.md's Operating Context).
- **Don't** introduce a cool-gray neutral anywhere; every neutral in this system is warm (oklch hue ≈ 60–85), matching the Warm-Neutral-Only Rule.

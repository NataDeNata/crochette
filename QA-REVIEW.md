# QA Site Review — Crochette

**Target:** https://crochette-zeta.vercel.app/
**Date:** 2026-08-06
**Reviewer:** Senior QA
**Branch under test:** `redesign/ui-rehaul`
**Method:** Manual exploratory testing in Chrome at 1920×919 desktop, plus DOM/accessibility/performance inspection and a code-level trace of reproduced defects.

---

## 1. Executive summary

Crochette is a genuinely well-designed storefront. The visual identity — die-cut arch cutouts, dashed keylines, editorial serif display type, warm cream palette — is distinctive and memorable in a category full of identical Shopify themes. The commerce fundamentals are largely sound: guest checkout works, cart math is correct, stock limits are enforced, shipping is disclosed before checkout, and payment runs through a real Xendit integration with strong Philippine coverage.

The problem is that **a headline visual technique is actively breaking the core shopping flow.** A scroll-triggered reveal animation is applied to product cards in a way that leaves them invisible or stale after any filter, search, or pagination action. Searching the shop reports the correct result count while continuing to display the entire unfiltered catalogue. This is the single highest-value fix on the list, and it is one root cause producing three separate user-facing symptoms.

Alongside that sit several **content and trust defects that are more damaging than their difficulty suggests**: a product photo that is a blurry human face, another carrying a competitor's watermark, a placeholder product called "Cat the Dog" live in the catalogue, and a payment page that identifies the merchant as "ndnpro" rather than Crochette.

None of these are hard to fix. Most are hours, not weeks.

**Verdict: not ready for launch.** The blockers are concentrated and tractable — realistically a few days of focused work.

---

## 2. Severity summary

| Severity | Count | Nature |
|---|---|---|
| Critical | 3 | Breaks browsing, checkout comprehension, or legal/brand safety |
| High | 4 | Direct trust or conversion damage |
| Medium | 13 | Real friction, accessibility and SEO gaps |
| Low | 10 | Polish, copy, minor a11y |

---

## 3. What works well

These are real strengths and should be protected through any remediation.

**Design and brand**
- The die-cut arch motif, dashed keylines and press-sheet vocabulary give the site a genuine point of view. It reads as a craft studio, not a template. This is the site's biggest asset.
- Typography hierarchy is confident and the cream/rust palette is warm and consistent.
- Empty states are designed, not defaulted — "Nothing on this sheet" with an uncut die line matches the world and names the recovery.
- The 404 page is well-built and offers two sensible recovery paths.

**Commerce mechanics**
- **Guest checkout works** — no forced account creation. A meaningful conversion win that many small stores get wrong.
- **Stock limits are correctly enforced.** The PDP quantity stepper caps at available stock (verified: could not exceed 5 on a "Only 5 left" item).
- **Cart math is correct.** 5 × ₱950 = ₱4,750, + ₱100 shipping = ₱4,850, carried accurately through to the payment page.
- **Shipping cost is shown in the cart**, before checkout. No surprise fees at the final step — a common and costly dark pattern, avoided here.
- Scarcity messaging is handled with restraint and honesty: "LAST 5", "SOLD OUT", "ALL WE HAVE LEFT". Sold-out items are visually distinct and not purchasable.
- The **custom order flow is excellent** — a clear 3-step explainer (tell us / we quote / stitched & shipped), a live preview card that updates as you choose, type and size and colour pickers, and reference photo upload with stated limits (4 photos, JPG/PNG/WebP, 5MB).

**Payments**
- Real Xendit integration with genuinely strong Philippine market coverage: Cards, GCash/Maya/GrabPay e-wallets, online banking (BPI, BDO +3), over-the-counter (+9 outlets), QR Ph, plus Google Pay and Apple Pay. This is well matched to the local market.

**Technical quality**
- **Fast.** TTFB ~48 ms, DOMContentLoaded ~1.44 s, full load ~1.49 s on the shop page.
- **`prefers-reduced-motion` is fully respected** — `FadeIn` bypasses animation entirely and renders content visible. Genuinely good practice.
- **Responsive breakpoints exist** at 480 / 600 / 640 / 760 / 860 px, plus `(pointer: coarse)` and `(hover: none)` handling.
- Correct viewport meta tag.
- **All product images carry alt text** and are lazy-loaded.
- Single, correct `<h1>` per page.
- **`/admin` is properly gated** behind a login — no unauthenticated access to the studio dashboard.
- Inline per-field validation exists on checkout, and error text contrast measures **4.80:1**, passing WCAG AA.
- Product detail pages include `og:image` and JSON-LD structured data.
- No console errors observed.

---

## 4. Critical issues

### C1 — Shop grid desynchronises from filter, search and pagination state

**The most important defect on the site.** One root cause, three visible symptoms.

*Symptom A — Search does not filter the grid.*
Typing `bear` into the shop search updates the count to "1 PIECE" while the grid continues to display all 10 products (Cloud Basket, Sunny Daisy Bouquet, Rosebud Coaster Set…). Reproduced twice, with waits of 4+ seconds. The user is told there is one match and shown ten.

*Symptom B — Filtered results are invisible until you scroll.*
Selecting the **Flowers** category updates the count to "2 PIECES" and renders an entirely blank grid area. The two products only become visible after the user scrolls. A customer who filters and sees nothing will conclude the category is empty and leave.

*Symptom C — Pagination appears to append rather than paginate.*
Clicking page **02** sets the label to "PAGE 2 OF 2" but the grid then shows all 10 products rather than the single item on page 2.

**Root cause.** `components/motion/FadeIn.tsx` animates with:

```tsx
initial={{ opacity: 0, y }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, margin: "-80px" }}
```

Cards mount at `opacity: 0` and only reveal on an IntersectionObserver callback, shrunk further by the `-80px` margin. In `components/shop/ShopGrid.tsx` these are wrapped in `<AnimatePresence mode="popLayout">`. When the filter/search/page state changes, replacement cards mount invisible without a fresh intersection event, while outgoing cards linger. The filtering logic in `ShopGrid.tsx` (lines 31–40) is itself **correct** — the count proves it. The bug is purely in the reveal layer sitting on top of it.

**Recommendation.** Apply `whileInView` reveal only to the initial mount. On any state change, render results immediately visible (or drive presence from an `animate` prop tied to filter state rather than viewport intersection). Verify by filtering without scrolling.

---

### C2 — Checkout shows validation errors on correctly filled fields, and does not block on them

Submit the checkout form empty and per-field errors appear correctly. Then fill every field properly: **the errors remain.** "Please enter your name" sits under a field containing `QA Tester`; "Please enter your street address" sits under `123 Test Street`. Confirmed the inputs genuinely hold their values.

Worse, the errors are cosmetic — they do not gate submission. With every visible field still showing an error, the button proceeds to "PREPARING CHECKOUT…" and redirects to the payment page.

So the form both **cries wolf** (errors on valid data) and **fails to guard** (errors that don't block). A customer sees six red errors at the exact moment they are being asked to pay ₱4,850. That is a checkout-abandonment event.

**Recommendation.** Re-validate per field on change/blur and clear resolved errors. Decide deliberately whether errors block submission, and make the visible state match.

---

### C3 — Product image is a photograph of a person's face

The **Sunny Daisy Bouquet** listing displays a blurry, sepia-toned photograph of a human face on the homepage, the shop grid, and the category view. It is not a product photo and bears no relationship to a crochet daisy bouquet.

This is the second product visible on the homepage. It is the single most damaging thing on the site for first-impression credibility, and it may also be a personal image published without intent.

**Recommendation.** Replace immediately. Audit all catalogue imagery before launch.

---

## 5. High-severity issues

### H1 — Competitor watermark on a product photo

The **Bumble the Bee** photograph carries a visible script watermark reading **"hooked by robin"** — another maker's branding, on a product Crochette is selling as its own handmade work.

This is a legal exposure (copyright) and directly contradicts the site's central claim that "Every piece passes through the same two hands." Alongside it, product photography is visibly inconsistent — varying backgrounds, lighting and crops suggest images from mixed sources.

**Recommendation.** Remove this image now. Audit provenance of every catalogue photo. Commission consistent first-party photography.

### H2 — Payment page identifies the merchant as "ndnpro", on a staging endpoint

Checkout redirects to `checkout-staging.xendit.co`, where the merchant is displayed as **"ndnpro"** and the pay button reads **"Pay to ndnpro"**. Nothing on the page says Crochette.

The handoff to payment is the highest-anxiety moment in the purchase. Landing on an unfamiliar business name is a textbook abandonment trigger, and legitimately looks like a redirect scam.

The `-staging` endpoint is expected on a preview deployment, but must be confirmed switched for production.

**Recommendation.** Set the Xendit merchant display name to Crochette. Confirm production credentials before launch.

### H3 — Placeholder product live in the catalogue

**"Cat the Dog" — ₱650** is listed as a purchasable product. The name is placeholder test data and its photograph does not depict a cat or a dog.

It is not in `lib/data/products-seed.ts`, so it was created through the admin panel — meaning production test data is live and customer-visible. (The face photo in C3 and the watermarked image in H1 share this origin.)

**Recommendation.** Delete it. Establish a rule that admin test records never persist to production.

### H4 — Currency mismatch on custom order form

The entire store prices in Philippine pesos (₱380–₱1,200). The custom order budget selector offers **"UNDER $50", "$50–120", "$120+"** — US dollars.

At current rates $50 is roughly ₱2,800, so a customer selecting "under $50" and one reading it as ₱50 are describing budgets two orders of magnitude apart. This directly corrupts the quoting process the form exists to serve.

**Recommendation.** Convert to peso bands aligned to actual catalogue pricing.

---

## 6. Medium-severity issues

### M1 — Slow page-level fade-in leaves content washed out or blank on every navigation
Every page renders at partial opacity for several seconds after load. On the shop page the product area was still empty 3 seconds in, and the whole page still visibly faded at ~7 seconds — during which typed input was silently dropped. It reads as a broken or still-loading page. Same `FadeIn` mechanism as C1.

### M2 — Gallery is empty but holds a primary nav slot
`/gallery` contains only "PHOTOS COMING SOON". A top-level nav item that leads nowhere is a dead end on a visual-craft site where the gallery is a natural browsing destination. Either populate it or remove it from the nav until it has content.

### M3 — Checkout inputs have no labels, no ARIA, and no autocomplete
Programmatic audit of all nine checkout inputs returned: `hasLabel: false`, `aria-label: null`, `autocomplete: null`, `required: false`, `aria-invalid: null` for every field.

Three consequences: screen reader users get no field names; the placeholder-only pattern means the label vanishes once typing starts; and the absent `autocomplete` attributes disable browser address autofill, adding manual typing to every checkout. (The shop search field, by contrast, has a proper `sr-only` label — the pattern exists, it just isn't applied here.)

### M4 — No shipping, returns, privacy or terms information anywhere
No policy pages, no footer links, no delivery estimates. For a store taking real payments this is a trust gap and likely a consumer-law compliance gap. Customers cannot find out how long a handmade piece takes to ship, or what happens if it arrives damaged.

### M5 — Homepage inventory claim is inaccurate
The hero states **"10 PIECES AVAILABLE TODAY"**. The shop holds 10 products, of which one (Sunny Daisy Bouquet) is sold out — so 9 are available. The homepage grid shows only 8. Three numbers, none agreeing.

### M6 — Homepage shows the same four products twice
The hero rail and the "Everything currently available" grid both lead with Cloud Basket, Sunny Daisy Bouquet, Rosebud Coaster Set and Tiny Turtle Duo. With only 10 products, the repetition makes the catalogue look thinner than it is.

### M7 — Product detail pages are too thin to sell from
The Cloud Basket page carries one sentence of description. Missing: dimensions, materials/yarn, care instructions, delivery estimate, related products, and any social proof. For a ₱950 handmade item bought sight-unseen, dimensions and materials are decision-critical. There is also a large empty right column below the buy box that could carry exactly this.

### M8 — Footer contact details are not links
`hello@crochette.shop` and `@crochette.studio` render as plain text in the footer — no `mailto:`, no Instagram link. Confirmed: neither appears among footer anchors. Mobile users cannot tap to email or follow.

### M9 — Admin link exposed in the public footer
An **Admin** link sits in the footer of every customer-facing page. The route is properly gated (a real positive), but advertising the admin entry point to every visitor is unnecessary attack surface and looks unfinished. Access it by direct URL or bookmark.

### M10 — Above-the-fold images are lazy-loaded
All 9 shop images carry `loading="lazy"`, including those in the initial viewport. Lazy-loading the LCP image delays it by design. Mark above-fold images eager/priority.

### M11 — No `og:image` or structured data on home and shop pages
The homepage has no `og:image` and no JSON-LD. Product pages have both — so the capability exists but isn't applied to the two most-shared URLs. For a visual brand shared via Instagram, Messenger and Facebook, a link preview with no image is a significant miss. Adding `Organization`/`WebSite` JSON-LD would also help.

### M12 — No canonical URLs
No `<link rel="canonical">` on any page tested, including product pages.

### M13 — Shop filter state is not reflected in the URL
Category, search and page all live in client state only; the URL stays `/shop`. Filtered views can't be shared, bookmarked, or reached via back-button, and can't be indexed.

---

## 7. Low-severity issues

| ID | Issue |
|---|---|
| L1 | 404 page uses the generic homepage `<title>` ("Crochette \| Handmade crochet decor") instead of naming the error |
| L2 | Alt text for Sunny Daisy Bouquet is `"sunny"` — a placeholder, not a description |
| L3 | Homepage `<h1>` reads `"Made by hand.Made to keep."` — no space between sentences, so screen readers announce "handMade" |
| L4 | Custom order preview shows **"THIS ONE HASN'T BEEN PRINTED YET"** — print vocabulary borrowed from the design metaphor, wrong for crochet. "Not stitched yet" fits |
| L5 | Custom order colour swatches are colour-only with no accessible names — unusable for colour-blind and screen reader users |
| L6 | No skip-to-content link on any page |
| L7 | Studio hours ("Mon–Fri, 9am–5pm") given without timezone; no business address or phone number |
| L8 | No sort control on the shop (price, newest) — only category filters and search |
| L9 | No toast or confirmation on add-to-cart; the only feedback is the cart badge incrementing |
| L10 | Quantity stepper stops silently at stock limit with no explanation of why |

---

## 8. Recommended priority order

**Before launch — blockers**
1. C3 — remove the human-face product photo
2. H1 — remove the watermarked photo, audit image provenance
3. H3 — delete the "Cat the Dog" placeholder product
4. C1 — fix the shop grid reveal/filter desync
5. C2 — fix checkout validation state
6. H2 — set Xendit merchant name to Crochette; confirm production credentials
7. H4 — convert custom order budgets to pesos
8. M4 — publish shipping, returns and privacy information

**Shortly after**
9. M3 — checkout labels, ARIA and autocomplete
10. M1 — reduce page-level fade-in delay
11. M2 — populate or hide the Gallery
12. M5/M6 — correct the inventory claim, vary the homepage grid
13. M7 — enrich product pages with dimensions, materials, care and delivery
14. M8/M9 — link footer contacts; remove the public Admin link

**Backlog**
15. M10–M13 — image priority, `og:image`, JSON-LD, canonicals, URL-driven filter state
16. L1–L10 — copy, alt text and accessibility polish

---

## 9. Coverage and limitations

**Tested:** homepage, shop listing (search, category filters, pagination), product detail, cart, checkout form and validation, payment handoff, gallery, about, custom orders, contact, account sign-in, admin gate, 404 handling, console errors, load performance, SEO metadata, and a programmatic accessibility audit of the checkout form.

**Not tested — needs a follow-up pass:**
- **Real mobile viewport rendering.** Browser window resizing did not take effect in this environment (`innerWidth` stayed at 1920), so mobile layout could not be visually verified. Responsive breakpoints and coarse-pointer handling are present in CSS, but **no mobile view was actually confirmed** — including whether a mobile nav menu exists, since the desktop header contains no toggle button. This is a genuine gap and should be the first item in the next session, ideally on real devices.
- **Completing a payment.** I stopped at the Xendit page and entered no card, wallet or banking credentials, so order confirmation, confirmation email, and post-purchase order tracking are unverified.
- **Account creation and sign-in**, including the Google OAuth path — no accounts were created and no passwords entered.
- **Admin panel behaviour** behind the login.
- **Discount code redemption** — the field exists but no valid code was available.
- Cross-browser testing (Chrome only) and formal screen reader testing.

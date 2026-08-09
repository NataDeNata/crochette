import Link from "next/link";
import type { Product } from "@/lib/data/products";
import { Cutout } from "@/components/ui/Cutout";

/* The first viewport: one printed press-out sheet lying on the viridian ground.
 *
 * The composition is the artifact's own. A press sheet carries trim marks at
 * its corners, a masthead across the head, an instruction line, and then the
 * figures — each ringed by a dashed cut line with a fold tab above it. Nothing
 * here is a hero photograph with a scrim over it; there is no decorative
 * background image in this world at all. The only photographs are the ones
 * inside the die-cut windows, and those are evidence: full colour, uncropped
 * by mood, showing the piece a buyer would actually receive.
 *
 * The figures come from `components/ui/Cutout`, which every product surface in
 * the world shares. This file held its own copy while the direction was being
 * judged; two implementations of the same construction is exactly how the
 * sold-out and low-stock states end up being right in one place and wrong in
 * the other.
 *
 * The press-out lift is CSS on :hover and :focus-within (see .cutout-slot in
 * globals.css) rather than a motion library, so it costs no client work beyond
 * the cart button the figure already carries, and keyboard users get it from
 * the same rule.
 */
export function CutoutHero({
  pieces,
  pieceCount,
}: {
  pieces: Product[];
  pieceCount: number;
}) {
  const [lead, ...rest] = pieces;
  const secondary = rest.slice(0, 3);

  return (
    /* The viridian margin and the 2px key rule that used to frame this are gone.
       They put a hard rectangle around the first thing anyone sees, which meant
       the page opened by drawing its own edge rather than by showing the work.
       The sheet is the page now: full bleed, cream, gutter only. */
    <section className="bg-sheet">
      <div className="relative">
        <div className="relative px-5 pt-5 pb-8 sm:px-8 sm:pt-7 sm:pb-10 lg:px-12 lg:pt-9 lg:pb-12">
          {/* The colophon row that used to open the page — "Press-out sheet
              No. 01" ruled off against "Cut along the dotted line" — is gone,
              along with its counterparts on every other route.

              It was the artifact describing itself. A visitor arriving to buy a
              crocheted bear was met first by a line of small caps explaining
              the metaphor of the page they were on, above the headline that
              actually says what the studio does. The die cuts, the dashed cut
              lines and the fold tabs already establish the world without
              narrating it; the words were the one part of the conceit that had
              to be read rather than seen, and reading them cost the headline
              its first position. */}
          {/* `lg:pr-[120px]` is the product's inset from the right edge, and it
              only exists at `lg` and up because that is the only place the
              problem exists: below the breakpoint the grid is one column and
              the figure is already centred by its own `mx-auto`.

              120px is 30% of the 400px the product column tops out at, applied
              as trailing padding on the grid rather than as a transform on the
              figure. A transform would have been the more literal reading of
              "move it left", but it moves paint without moving the layout box:
              at 1440px the figure would have slid 120px into a text column that
              still believed it owned that space, and the collision would have
              depended on how long the headline happened to be. Padding moves
              the track itself, so the text column reflows to match and the two
              can never overlap at any width. */}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] lg:items-center lg:gap-16 lg:pr-[120px]">
            <div>
              {/* Set in sentence case. The didone's character is in its
                  lowercase — the ball terminals, the hairline joins, the
                  thin-to-thick swing — and an all-caps setting throws every one
                  of those away and leaves a wall of rectangles. */}
              {/* The space before the second sentence is load-bearing, not
                  formatting. A <br> contributes no word break to the
                  accessibility tree, so "Made by hand.<br>Made to keep."
                  flattens to "Made by hand.Made to keep." and is announced as
                  "handMade" — the site's headline, mispronounced, on every
                  visit by a screen reader. */}
              <h1 className="type-sheet-display text-[clamp(44px,8vw,104px)] text-keyline text-balance">
                Made by hand.{" "}
                <br />
                <span className="text-press-red">Made to keep.</span>
              </h1>

              <p className="mt-6 max-w-[46ch] text-[17px] leading-[1.6] text-muted-foreground sm:text-[18px]">
                Amigurumi, flowers and cozy decor, crocheted one piece at a time
                in a small studio. Everything here is a real piece you can order
                today. If the one you want isn&apos;t here, we will make it.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <SheetTab href="/shop" tone="red">
                  Shop the collection
                </SheetTab>
                <SheetTab href="/custom" tone="plain">
                  Order one that isn&apos;t here
                </SheetTab>
              </div>

              {/* Kept, because unlike the colophon this is a live fact about
                  the catalogue rather than a description of the page. Reworded
                  off "figures on the sheet" for the same reason the colophon
                  went: a shopper counts pieces, not figures. */}
              <p className="type-sheet-spec mt-9 text-keyline/60">
                {pieceCount} {pieceCount === 1 ? "piece" : "pieces"} available
                today · crocheted in small batches
              </p>
            </div>

            {lead && (
              <div className="mx-auto w-full max-w-[300px] lg:max-w-none">
                <Cutout product={lead} scale="lead" priority />
              </div>
            )}
          </div>

          {secondary.length > 0 && (
            <div className="mt-12 border-t-2 border-keyline pt-8 lg:mt-16">
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8">
                {secondary.map((product) => (
                  <Cutout key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* Actions are tabs, not buttons: the same construction as a figure's fold tab,
 * because in this world the way you take something off the sheet is by its tab.
 * A stock pill here would be the one component that forgot which page it is on.
 */
function SheetTab({
  href,
  tone,
  children,
}: {
  href: string;
  tone: "red" | "plain";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      data-slot="button"
      className={`group inline-flex items-center justify-center gap-3 border-2 border-keyline px-6 py-3.5 text-[14px] font-semibold uppercase tracking-[0.08em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red ${
        tone === "red"
          ? "bg-press-red text-sheet hover:bg-keyline"
          : "bg-sheet text-keyline hover:bg-butter"
      }`}
    >
      {children}
      <Scissors />
    </Link>
  );
}

/* Drawn, not a glyph — one stroke weight, matching the sheet's keyline. The
 * mark is scissors because the action it sits on is cutting something out. */
function Scissors() {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
    >
      <circle cx="4" cy="13.5" r="2.4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="4" cy="4.5" r="2.4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.1 5.9 16 14M6.1 12.1 16 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

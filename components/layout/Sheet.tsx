import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* A sheet.
 *
 * It used to be a sheet lying *on* something: a viridian margin on all four
 * sides, trim marks printed into it, and a 2px key rule around bright white
 * stock. That frame is gone from every one of these. It drew a hard rectangle
 * around each section, and with eight sections stacked down a page the effect
 * was not "a sheet on a table" but a column of boxes, each one telling the eye
 * to stop at its edge before the content inside it had said anything. On cream
 * stock the frame had no job left either — the ground and the sheet are a
 * hairline apart in luminance now, so an edge between them draws attention to a
 * difference there is no longer any reason to notice.
 *
 * What survives is what the frame was standing in for: the sheet is still the
 * page's surface and still gutters its content. The world reads as printed
 * matter because of its marks — the die cuts, the dashed cut lines, the fold
 * tabs — not because of a border around the body.
 *
 * `tight` is the only variant, for surfaces that carry their own inner gutter
 * (the gallery runs its plates edge to edge).
 */
export function Sheet({
  children,
  className,
  innerClassName,
  tight = false,
}: {
  children: ReactNode;
  /** Applied to the outer section — use for outer spacing only. */
  className?: string;
  /** Applied to the sheet itself. */
  innerClassName?: string;
  /** Skip the sheet's own page-gutter, for content that gutters itself. */
  tight?: boolean;
}) {
  return (
    <section className={cn("bg-sheet", className)}>
      <div className={cn(!tight && "page-gutter", innerClassName)}>{children}</div>
    </section>
  );
}

/* `SheetHead` used to live here — the colophon across the head of a sheet,
 * ruled off in 2px key.
 *
 * Its own doc comment claimed it was "deliberately NOT an eyebrow above the
 * heading" because it "carries live facts rather than restating the heading in
 * small caps". On two of its four call sites it did exactly the thing it
 * disclaimed: /contact printed "Get in touch" directly above the heading
 * "Let's get in touch", and /about printed "The studio" above "A small studio,
 * made from yarn and patience". A comment asserting a rule is not the rule; the
 * component's own file already carried a note about deleting the eyebrows this
 * pattern then quietly reintroduced.
 *
 * The genuinely live facts it carried — the catalogue count — moved to the one
 * place that needed them, below the heading in ShopGrid. The product page keeps
 * a row of this shape by hand, because a back link and a category are
 * navigation rather than furniture.
 */

import type { ReactNode } from "react";

/** The detail-view building blocks from the design's dialog cards.
 *
 * These replace the `fieldClass` / `labelClass` string consts that were
 * previously declared — byte-for-byte identically — in both
 * app/admin/orders/[id]/page.tsx and app/admin/custom-orders/[id]/page.tsx.
 * Two copies of the same two class strings is exactly the kind of duplication
 * that drifts the first time one page's type scale is nudged. */

/** A single label/value line: muted label left, value right. The design's
 * dialog body row. Use for short scalar values. */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="flex-none text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

/** Label above value, for anything that needs to wrap — an address, a
 * description, a photo grid. */
export function DetailBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

/** The design's `.hr` — a hairline rule between groups inside a card. */
export function DetailDivider() {
  return <hr className="m-0 h-px border-0 bg-border" />;
}

import { barHeightPercent, type RevenueBar } from "@/lib/data/analytics";
import { formatPrice } from "@/lib/data/products";

/** The design's "Revenue, last 7 days" bar chart, as plain divs.
 *
 * No charting library: none is installed, and shadcn's `chart` primitive would
 * pull in recharts — a client-side dependency for seven static rectangles that
 * need no interaction, no axes, and no responsiveness beyond flexbox. This
 * stays a Server Component and ships zero JS.
 *
 * ── The one inline style in /admin ──
 * Bar height is genuinely per-datum runtime data with no fixed set of possible
 * values, so it cannot become a Tailwind class. That is precisely the case
 * app/globals.css's comment block already carves out for CSS custom properties
 * (the existing precedent is GallerySection.tsx's --row-h), and that comment
 * names this file. The rest of the chart is Tailwind. */
export function RevenueChart({ bars }: { bars: RevenueBar[] }) {
  const maxCents = Math.max(0, ...bars.map((b) => b.totalCents));
  const totalCents = bars.reduce((sum, b) => sum + b.totalCents, 0);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <h2 className="m-0 font-serif text-lg font-medium">Revenue, last 7 days</h2>
        <span className="ml-auto font-serif text-lg font-medium">{formatPrice(totalCents)}</span>
      </div>

      {maxCents === 0 ? (
        // A flat axis of 2%-high slivers would read as a rendering fault rather
        // than as "no sales", so an empty week says so in words instead.
        <p className="m-0 py-10 text-center text-sm text-muted-foreground">
          No paid orders in the last 7 days.
        </p>
      ) : (
        <div className="flex h-[150px] items-end gap-3 pt-2">
          {bars.map((bar) => (
            <div key={bar.dayKey} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div
                // The deliberate exception documented at the top of this file.
                style={{ "--bar-h": `${barHeightPercent(bar.totalCents, maxCents)}%` } as React.CSSProperties}
                className="w-full max-w-[28px] rounded-t-lg rounded-b-sm bg-brand h-[var(--bar-h)]"
                title={`${bar.label}: ${formatPrice(bar.totalCents)}`}
              />
              <span className="text-[11px] text-muted-foreground">{bar.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

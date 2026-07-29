import { Badge } from "@/components/ui/badge";

/** Amber "needs attention but nothing is broken" tone — the same hue 60 the
 * admin already uses for pending order status (app/admin/orders/page.tsx).
 * Deliberately not `text-destructive`: red is reserved for sold out / zero
 * stock, and low stock is a plan-a-restock signal, not an error. Exported so
 * the dashboard tile and the row badge share one definition of the colour. */
export const LOW_STOCK_TEXT_CLASS = "text-[oklch(0.5_0.13_60)]";

/** shadcn's Badge has no "warning" variant, and the three that exist are all
 * wrong here (destructive = the sold-out signal, default = solid primary,
 * secondary = muted grey). Starting from `outline` and overriding reproduces
 * the exact shape of the built-in `destructive` variant — tinted background,
 * tinted text, subtle border — in amber, so it reads as a sibling of the
 * existing badges rather than a bolt-on. */
export function LowStockBadge({ threshold }: { threshold: number }) {
  return (
    <Badge
      variant="outline"
      className="border-[oklch(0.86_0.06_60)] bg-[oklch(0.55_0.12_60)]/10 text-[oklch(0.45_0.13_60)]"
      title={`Alerts at ${threshold} or fewer`}
    >
      Low
    </Badge>
  );
}

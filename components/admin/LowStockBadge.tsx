import { Badge } from "@/components/ui/badge";

/** The amber "Low" badge on a products-list row.
 *
 * Amber — the `--warning` role — is a deliberate third signal, not a shade of
 * the other two. `destructive` red is reserved for sold out / zero stock, and
 * low stock means *restock soon*, not *too late*; the dashboard's "Products
 * running low" tile uses the same role for the same reason.
 *
 * Not routed through AdminStatusTag: "low" is a derived condition
 * (lowStockCondition in lib/db/inventory.ts), not a value of any DB enum, so it
 * has no business in that component's status→tone table. It borrows the same
 * tinted-outline shape, which is the part worth sharing visually.
 *
 * This file used to also export a `LOW_STOCK_TEXT_CLASS` const so the dashboard
 * tile and this badge couldn't drift apart in colour. That const is gone: the
 * `--warning` token in app/globals.css is now the single definition it was
 * standing in for, and both surfaces reference the token directly. */
export function LowStockBadge({ threshold }: { threshold: number }) {
  return (
    <Badge
      variant="outline"
      className="border-warning/25 bg-warning-soft text-warning-soft-foreground"
      title={`Alerts at ${threshold} or fewer`}
    >
      Low
    </Badge>
  );
}

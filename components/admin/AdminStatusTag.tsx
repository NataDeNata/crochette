import { Badge } from "@/components/ui/badge";

/** The five tinted tones the admin uses to signal state, plus a plain outline.
 *
 * shadcn's Badge has no "warning"/"info"/"success" variant, and the three it
 * ships are all wrong for status work (`destructive` is spoken for by
 * failed/declined, `default` is solid primary, `secondary` is muted grey). So
 * each tone here starts from `outline` and overrides to reproduce the exact
 * shape of the built-in `destructive` variant — tinted background, tinted
 * text, subtle border — in its own hue. That keeps them reading as siblings of
 * the built-in badges rather than as a bolt-on. LowStockBadge established this
 * pattern for amber; this generalises it.
 *
 * The tokens come from app/globals.css. Before this file existed, the same
 * meanings were spelled out as ~20 one-off raw colour literals in arbitrary
 * Tailwind values, duplicated across three separate maps (STATUS_TEXT_CLASSES
 * in both
 * app/admin/orders/page.tsx and app/admin/custom-orders/page.tsx, plus
 * STATUS_VARIANT in app/admin/products/page.tsx), which could and did drift. */
const TONE_CLASSES = {
  brand: "border-brand/25 bg-brand-soft text-brand-soft-foreground",
  sage: "border-sage/25 bg-sage-soft text-sage-soft-foreground",
  warning: "border-warning/25 bg-warning-soft text-warning-soft-foreground",
  info: "border-info/25 bg-info-soft text-info-soft-foreground",
  destructive: "border-destructive/25 bg-destructive-soft text-destructive-soft-foreground",
  neutral: "border-border bg-muted text-muted-foreground",
  outline: "border-brand/40 bg-transparent text-brand",
} as const;

export type StatusTone = keyof typeof TONE_CLASSES;

/** Every status value across all three admin vocabularies, in one place.
 *
 * The keys are deliberately the raw DB enum values from lib/db/schema.ts
 * (`order_status`, `custom_order_status`, `product_status`) so a status can
 * never be styled under a label that has drifted from what is stored. There is
 * no collision between the three enums today except `shipped`/`completed`,
 * which mean the same thing in both order flows and so share a tone by
 * design. */
const STATUS_TONES: Record<string, StatusTone> = {
  // order_status
  pending: "warning",
  paid: "sage",
  failed: "destructive",
  shipped: "info",
  completed: "neutral",
  cancelled: "neutral",
  // custom_order_status (shipped/completed shared with the above)
  new: "brand",
  quoted: "warning",
  accepted: "sage",
  in_production: "info",
  declined: "neutral",
  // product_status
  active: "sage",
  draft: "neutral",
  sold_out: "destructive",
};

/** Turns a DB enum value into the label the admin reads — `in_production` →
 * `in production`, `sold_out` → `sold out`. Underscores only; casing is left
 * to the `capitalize` class so the label stays a single source of truth. */
export function humanizeStatus(status: string) {
  return status.replaceAll("_", " ");
}

export function AdminStatusTag({
  status,
  tone,
  className,
}: {
  status: string;
  /** Override the looked-up tone. Only needed for values outside the three DB
   * enums (e.g. the discounts list's derived "Expired"/"Limit reached"). */
  tone?: StatusTone;
  className?: string;
}) {
  const resolved = tone ?? STATUS_TONES[status] ?? "neutral";
  return (
    <Badge
      variant="outline"
      className={`capitalize ${TONE_CLASSES[resolved]}${className ? ` ${className}` : ""}`}
    >
      {humanizeStatus(status)}
    </Badge>
  );
}

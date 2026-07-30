import { cn } from "@/lib/utils";

const STEPS = [
  { key: "pending", label: "Placed" },
  { key: "paid", label: "Paid" },
  { key: "shipped", label: "Shipped" },
  { key: "completed", label: "Completed" },
] as const;

const ACTIVE_DOT = "bg-[oklch(0.55_0.12_150)]";
const ACTIVE_LABEL = "text-[oklch(0.4_0.05_150)] font-medium";
const INACTIVE_DOT = "bg-[oklch(0.88_0.01_60)]";
const INACTIVE_LABEL = "text-[oklch(0.65_0.01_60)]";

/** Visual 4-step tracker for an order's fulfillment lifecycle. Only
 * meaningful for orders still moving forward (pending/paid/shipped/completed)
 * — callers should exclude failed/cancelled orders, which have no useful
 * "progress" to show. */
export function OrderTracker({ status }: { status: string }) {
  const activeIndex = STEPS.findIndex((s) => s.key === status);
  const currentIndex = activeIndex === -1 ? 0 : activeIndex;

  return (
    <div className="flex items-start">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", i <= currentIndex ? ACTIVE_DOT : INACTIVE_DOT)} />
            <span
              className={cn(
                "text-[10px] sm:text-[11px] whitespace-nowrap",
                i <= currentIndex ? ACTIVE_LABEL : INACTIVE_LABEL,
              )}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn("h-[2px] flex-1 mx-1.5 -mt-[18px]", i < currentIndex ? ACTIVE_DOT : INACTIVE_DOT)} />
          )}
        </div>
      ))}
    </div>
  );
}

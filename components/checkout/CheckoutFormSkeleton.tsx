import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Placeholder for the checkout form, used in two places.
 *
 * 1. `app/checkout/loading.tsx` — the Suspense fallback while the page awaits
 *    `auth()` and then `listAddresses()`.
 * 2. `CheckoutForm` itself, until the cart store has loaded.
 *
 * The second one is why this is a shared component rather than markup living
 * in `loading.tsx`. The cart is server-owned and the store starts empty, so
 * between hydration and the store's first read the form would otherwise render
 * against an empty cart — painting a real "Subtotal ₱0 / Total ₱100" summary
 * for a moment before either filling in or bouncing to /cart. Rendering this
 * instead means the skeleton stays on screen continuously from the server wait
 * through to real data, with no ₱0 frame in between.
 *
 * Track definitions are kept identical to `CheckoutForm`'s, `min()` included —
 * a flat 320px minimum here would overflow the phone the real form no longer
 * overflows, and the skeleton would jump on hydration. FIELD_H tracks the
 * shared field class there (py-3.5 + text-sm + 1.5px border), and the counts
 * below match the real field groups so the layout doesn't shift.
 */

const FIELD_H = "h-[50px]";

function FieldRow({ width = "w-full" }: { width?: string }) {
  return <Skeleton className={`${FIELD_H} ${width} rounded-xl`} />;
}

export function CheckoutFormSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-8 sm:gap-12 max-w-[900px] mx-auto">
      <div className="flex flex-col gap-3.5">
        {/* Contact — name, email, phone */}
        <Skeleton className="h-[22px] w-28 mb-1" />
        <FieldRow />
        <FieldRow />
        <FieldRow />

        {/* Shipping address — line1, line2, city, then province + postal */}
        <Skeleton className="h-[22px] w-44 mt-[18px] mb-1" />
        <FieldRow />
        <FieldRow />
        <FieldRow />
        <div className="flex gap-3">
          <FieldRow width="flex-1" />
          <FieldRow width="flex-1" />
        </div>

        {/* Discount code */}
        <Skeleton className="h-[22px] w-40 mt-[18px] mb-1" />
        <FieldRow />

        <Skeleton className="h-12 w-full rounded-[30px] mt-1" />
      </div>

      <div>
        <Skeleton className="h-[22px] w-40 mb-4" />

        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-40 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          ))}
        </div>

        <div className="mt-[18px] pt-3.5 border-t border-keyline/15 flex flex-col gap-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <div className="flex justify-between mt-1">
            <Skeleton className="h-[17px] w-16 rounded-full" />
            <Skeleton className="h-[17px] w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

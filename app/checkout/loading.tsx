import { Skeleton } from "@/components/ui/Skeleton";

/**
 * /checkout is the only async page left without an inherited fallback.
 *
 * When app/loading.tsx moved into the (home) route group — so that
 * /shop/[slug] and /order/[id] could return real 404s instead of streaming a
 * 200 — every route below root stopped inheriting a skeleton. The other
 * affected pages (/about, /contact, /custom, /cart) are synchronous and never
 * render a fallback, but this one awaits auth() and then listAddresses(), so
 * without a loading.tsx a click from /cart just holds on the old page.
 *
 * Reintroducing a Suspense boundary here is safe in a way it was not for the
 * product and order pages: /checkout has no notFound() path to lose, and it is
 * already robots-noindex (see page.tsx), so a soft-404 could not be indexed
 * even if one were possible.
 *
 * Mirrors CheckoutForm's two-column grid. FIELD_H tracks the shared field
 * class there (py-3.5 + text-sm + 1.5px border); the counts below match the
 * real field groups, so the layout doesn't jump when the form arrives.
 */

const FIELD_H = "h-[50px]";

function FieldRow({ width = "w-full" }: { width?: string }) {
  return <Skeleton className={`${FIELD_H} ${width} rounded-xl`} />;
}

export default function CheckoutLoading() {
  return (
    <section className="pt-12 px-12 pb-24">
      <Skeleton className="h-[34px] w-44 mx-auto mb-10" />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-12 max-w-[900px] mx-auto">
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

          <div className="mt-[18px] pt-3.5 border-t border-[oklch(0.92_0.015_60)] flex flex-col gap-2">
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
    </section>
  );
}

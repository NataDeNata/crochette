import { Skeleton } from "@/components/ui/Skeleton";
import { CheckoutFormSkeleton } from "@/components/checkout/CheckoutFormSkeleton";

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
 * The body is shared with CheckoutForm's own pre-hydration state — see
 * CheckoutFormSkeleton for why.
 */
export default function CheckoutLoading() {
  return (
    <section className="pt-12 page-gutter pb-24">
      <Skeleton className="h-[34px] w-44 mx-auto mb-10" />
      <CheckoutFormSkeleton />
    </section>
  );
}

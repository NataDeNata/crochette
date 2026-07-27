import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Fallback for ANY route lacking a more specific loading.tsx of its own —
 * i.e. every route except /shop, /shop/[slug], and /gallery (see their own
 * loading.tsx files) and /admin/*, /account/* (see app/admin/loading.tsx,
 * app/account/loading.tsx). That still includes the homepage itself, plus
 * /about, /contact, /custom, /cart, /checkout, and /order/[id] — Next.js
 * resolves the nearest ANCESTOR loading.tsx per route segment, and root is
 * the top-most ancestor for all of them.
 *
 * Deliberately generic (the eyebrow/heading/subtext "secondary page"
 * pattern already used by /shop and /gallery) rather than homepage-specific
 * — a homepage-only skeleton isn't achievable via file convention alone
 * without moving app/page.tsx into its own route group, which is a route
 * restructuring out of scope here.
 */
export default function RootLoading() {
  return (
    <section className="pt-[72px] px-12 pb-10 text-center">
      <Skeleton className="h-[13px] w-24 mx-auto mb-4 rounded-full" />
      <Skeleton className="h-[46px] w-[360px] max-w-full mx-auto mb-4" />
      <Skeleton className="h-4 w-[420px] max-w-full mx-auto mb-2 rounded-full" />
      <Skeleton className="h-4 w-[300px] max-w-full mx-auto rounded-full" />
    </section>
  );
}

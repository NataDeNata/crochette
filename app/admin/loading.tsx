import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Generic content-area fallback for any /admin/* page (dashboard, product
 * list, order list, forms, etc.) lacking a more specific loading.tsx of its
 * own. Rendered inside AdminLayout's <main>, so the sidebar and its nav
 * (components/admin/AdminSidebar.tsx) stay visible throughout — only this
 * inner area shows a placeholder. Deliberately generic rather than matching
 * any one admin page's exact table/form/card shape, since those vary widely.
 *
 * The tile grid now mirrors the dashboard's own `minmax(200px,1fr)`. It said
 * 220px before, so the placeholder tiles could wrap into a different column
 * count than the real content replacing them — a visible jump on every load.
 */
export default function AdminLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      {/* Stands in for AdminPageHeader: title line, subtitle line, bottom rule. */}
      <div className="-mx-6 flex flex-col gap-2 border-b border-border px-6 py-4 md:-mx-8 md:px-8">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

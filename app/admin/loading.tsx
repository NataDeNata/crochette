import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Generic content-area fallback for any /admin/* page (dashboard, product
 * list, order list, forms, etc.) lacking a more specific loading.tsx of its
 * own. Rendered inside AdminLayout's own <main className="p-8"> wrapper, so
 * the admin header/nav (app/admin/layout.tsx) stays visible throughout —
 * only this inner area shows a placeholder. Deliberately generic rather
 * than matching any one admin page's exact table/form/card shape, since
 * those vary widely across the dashboard.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-52" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

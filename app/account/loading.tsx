import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Generic content-area fallback for any /account/* page (dashboard, order
 * history, addresses) lacking a more specific loading.tsx of its own.
 * Rendered as {children} inside AccountLayout's own wrapper (its sub-nav
 * header renders above in app/account/layout.tsx), so that chrome stays
 * visible throughout — only this inner area shows a placeholder.
 */
export default function AccountLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}

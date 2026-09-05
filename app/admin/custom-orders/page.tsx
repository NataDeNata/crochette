import Link from "next/link";
import Image from "next/image";
import { desc, count, ilike, or, and, eq, type SQL } from "drizzle-orm";
import { Calendar, Image as ImageIcon } from "lucide-react";
import { db } from "@/lib/db";
import { customOrderRequests } from "@/lib/db/schema";
import { formatPrice } from "@/lib/data/products";
import { formatDate } from "@/lib/data/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";
import { AdminFilterTabs } from "@/components/admin/AdminFilterTabs";
import { AdminStatusTag, humanizeStatus } from "@/components/admin/AdminStatusTag";
import { containsPattern } from "@/lib/db/search";
import { readEnumParam, readPageParam, resolvePage } from "@/lib/db/pagination";
import { requireAdminPage } from "@/lib/auth-guard";

const CUSTOM_ORDER_STATUSES = [
  "new",
  "quoted",
  "accepted",
  "in_production",
  "shipped",
  "completed",
  "declined",
] as const;
const PAGE_SIZE = 20;

export default async function AdminCustomOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  await requireAdminPage();

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = readEnumParam(CUSTOM_ORDER_STATUSES, sp.status);
  const requestedPage = readPageParam(sp.page);

  const conditions: SQL[] = [];
  if (q) {
    const pattern = containsPattern(q);
    conditions.push(or(ilike(customOrderRequests.name, pattern), ilike(customOrderRequests.email, pattern))!);
  }
  if (status) conditions.push(eq(customOrderRequests.status, status));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(customOrderRequests).where(where);
  const { page, totalPages, limit, offset } = resolvePage({ total, requestedPage, pageSize: PAGE_SIZE });

  const rows = await db
    .select()
    .from(customOrderRequests)
    .where(where)
    // Total ordering for LIMIT/OFFSET — see app/admin/orders/page.tsx for why
    // `created_at` alone is not one.
    .orderBy(desc(customOrderRequests.createdAt), desc(customOrderRequests.id))
    .limit(limit)
    .offset(offset);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <AdminPageHeader
        title="Custom requests"
        subtitle="Bespoke pieces in progress"
        actions={
          <AdminSearchBar
            basePath="/admin/custom-orders"
            q={q}
            searchPlaceholder="Search by name or email…"
            hiddenParams={{ status: status || undefined }}
          />
        }
      />

      <AdminFilterTabs
        basePath="/admin/custom-orders"
        param="status"
        current={status}
        params={{ q: q || undefined }}
        options={[
          { label: "All" },
          ...CUSTOM_ORDER_STATUSES.map((s) => ({ value: s, label: humanizeStatus(s) })),
        ]}
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {q || status ? "No requests match your search." : "No requests yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const photo = r.referenceImageUrls?.[0];
            const extraPhotos = Math.max(0, (r.referenceImageUrls?.length ?? 0) - 1);
            return (
              <Link key={r.id} href={`/admin/custom-orders/${r.id}`} className="block text-inherit">
                <Card className="h-full transition-shadow hover:shadow-sm">
                  <CardContent className="flex h-full flex-col gap-2">
                    <div className="relative flex h-[110px] items-center justify-center overflow-hidden rounded-md bg-muted">
                      {photo ? (
                        // `fill`, not width/height: the box is a fixed 110px tall but its width
                        // is whatever the grid column gives it. These are customer uploads that
                        // lib/validation/photos.ts admits at up to 5 MB each, and a raw <img>
                        // shipped every one of those bytes into this thumbnail.
                        <Image
                          src={photo}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <ImageIcon className="size-3.5" aria-hidden />
                          No reference photo
                        </span>
                      )}
                      {extraPhotos > 0 ? (
                        <span className="absolute right-1.5 bottom-1.5 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-medium backdrop-blur">
                          +{extraPhotos}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="truncate text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                        {r.email}
                      </span>
                      <AdminStatusTag status={r.status} className="ml-auto flex-none" />
                    </div>

                    <div className="font-serif text-base leading-snug font-medium">{r.pieceType}</div>
                    <div className="flex-1 text-[13px] text-muted-foreground">
                      {r.name}
                      {r.preferredSize ? ` · ${r.preferredSize}` : ""}
                      {r.preferredColors ? ` · ${r.preferredColors}` : ""}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="size-3" aria-hidden />
                      {formatDate(r.createdAt)}
                      <span className="ml-auto font-semibold text-foreground">
                        {r.quotedPriceCents !== null
                          ? formatPrice(r.quotedPriceCents)
                          : r.budgetRange || "—"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <AdminPagination
        page={page}
        totalPages={totalPages}
        totalCount={total}
        basePath="/admin/custom-orders"
        params={{ q: q || undefined, status: status || undefined }}
      />
    </div>
  );
}

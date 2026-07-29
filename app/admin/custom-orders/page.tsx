import Link from "next/link";
import { desc, count, ilike, or, and, eq, type SQL } from "drizzle-orm";
import { Calendar, Image as ImageIcon } from "lucide-react";
import { db } from "@/lib/db";
import { customOrderRequests } from "@/lib/db/schema";
import { formatPrice } from "@/lib/data/products";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";
import { AdminFilterTabs } from "@/components/admin/AdminFilterTabs";
import { AdminStatusTag, humanizeStatus } from "@/components/admin/AdminStatusTag";

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
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = CUSTOM_ORDER_STATUSES.includes(sp.status as (typeof CUSTOM_ORDER_STATUSES)[number])
    ? sp.status!
    : "";
  const rawPage = Math.max(1, Number(sp.page) || 1);

  const conditions: SQL[] = [];
  if (q) conditions.push(or(ilike(customOrderRequests.name, `%${q}%`), ilike(customOrderRequests.email, `%${q}%`))!);
  if (status) conditions.push(eq(customOrderRequests.status, status as (typeof CUSTOM_ORDER_STATUSES)[number]));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(customOrderRequests).where(where);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(rawPage, totalPages);

  const rows = await db
    .select()
    .from(customOrderRequests)
    .where(where)
    .orderBy(desc(customOrderRequests.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

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
                        /* eslint-disable-next-line @next/next/no-img-element -- customer-uploaded
                           Vercel Blob URLs, same as the detail page: these are arbitrary remote
                           hosts that next/image would need configured remotePatterns for. */
                        <img src={photo} alt="" className="size-full object-cover" />
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
                      {r.createdAt.toLocaleDateString()}
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

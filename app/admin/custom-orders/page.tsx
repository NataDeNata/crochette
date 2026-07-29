import Link from "next/link";
import { desc, count, ilike, or, and, eq, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { customOrderRequests } from "@/lib/db/schema";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";

const STATUS_TEXT_CLASSES: Record<string, string> = {
  new: "text-[oklch(0.5_0.18_25)]",
  quoted: "text-[oklch(0.55_0.12_60)]",
  accepted: "text-[oklch(0.55_0.12_150)]",
  in_production: "text-[oklch(0.55_0.12_150)]",
  shipped: "text-[oklch(0.5_0.1_260)]",
  completed: "text-[oklch(0.5_0.02_60)]",
  declined: "text-[oklch(0.5_0.02_60)]",
};

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
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
      <h1 className="m-0 font-serif text-3xl font-medium">Custom order requests</h1>

      <AdminSearchBar
        basePath="/admin/custom-orders"
        q={q}
        status={status}
        statusOptions={CUSTOM_ORDER_STATUSES.map((s) => ({ value: s, label: s.replace("_", " ") }))}
        searchPlaceholder="Search by name or email…"
      />

      <div className="overflow-hidden rounded-[16px] border-[1.5px] border-[oklch(0.9_0.02_60)] bg-white">
        <table className="w-full border-collapse text-[14.5px]">
          <thead>
            <tr className="text-left bg-[oklch(0.97_0.01_60)]">
              {["Name", "Piece type", "Budget", "Photos", "Status", "Submitted"].map((h) => (
                <th key={h} className="py-3 px-4 font-semibold text-[oklch(0.45_0.02_60)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[oklch(0.93_0.01_60)]">
                <td className="py-3 px-4">
                  <Link href={`/admin/custom-orders/${r.id}`} className="text-inherit">
                    <strong className="font-medium">{r.name}</strong>
                    <div className="text-sm text-[oklch(0.55_0.02_60)]">{r.email}</div>
                  </Link>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{r.pieceType}</td>
                <td className="py-3 px-4 text-muted-foreground">{r.budgetRange || "—"}</td>
                <td className="py-3 px-4 text-muted-foreground">{r.referenceImageUrls?.length ?? 0}</td>
                <td className="py-3 px-4">
                  <span className={`${STATUS_TEXT_CLASSES[r.status] ?? "text-inherit"} capitalize`}>
                    {r.status.replace("_", " ")}
                  </span>
                </td>
                <td className="py-3 px-4 text-[oklch(0.55_0.02_60)]">
                  {r.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 px-4 text-center text-muted-foreground">
                  {q || status ? "No requests match your search." : "No requests yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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

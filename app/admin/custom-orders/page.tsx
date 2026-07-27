import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { customOrderRequests } from "@/lib/db/schema";

const STATUS_TEXT_CLASSES: Record<string, string> = {
  new: "text-[oklch(0.5_0.18_25)]",
  quoted: "text-[oklch(0.55_0.12_60)]",
  accepted: "text-[oklch(0.55_0.12_150)]",
  in_production: "text-[oklch(0.55_0.12_150)]",
  shipped: "text-[oklch(0.5_0.1_260)]",
  completed: "text-[oklch(0.5_0.02_60)]",
  declined: "text-[oklch(0.5_0.02_60)]",
};

export default async function AdminCustomOrdersPage() {
  const rows = await db.select().from(customOrderRequests).orderBy(desc(customOrderRequests.createdAt));

  return (
    <div className="flex flex-col gap-5 max-w-[1100px]">
      <h1 className="font-serif font-medium text-3xl m-0">Custom order requests</h1>

      <div className="rounded-[16px] border-[1.5px] border-[oklch(0.9_0.02_60)] overflow-hidden bg-white">
        <table className="w-full border-collapse text-[13.5px]">
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
                    <div className="text-xs text-[oklch(0.55_0.02_60)]">{r.email}</div>
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
                  No requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

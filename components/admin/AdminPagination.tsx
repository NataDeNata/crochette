import { Button } from "@/components/ui/button";

function buildHref(basePath: string, params: Record<string, string | undefined>, page: number) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** URL-driven (not client-state) pagination — page links are real hrefs, so
 * they compose with the search/filter query params already on the page and
 * work without JS, matching the DB-level LIMIT/OFFSET the list pages use. */
export function AdminPagination({
  page,
  totalPages,
  totalCount,
  basePath,
  params,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-[13px] text-muted-foreground">
        Page {page} of {totalPages} · {totalCount} total
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button href={buildHref(basePath, params, page - 1)} variant="outline" size="sm">
            ← Previous
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            ← Previous
          </Button>
        )}
        {page < totalPages ? (
          <Button href={buildHref(basePath, params, page + 1)} variant="outline" size="sm">
            Next →
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next →
          </Button>
        )}
      </div>
    </div>
  );
}

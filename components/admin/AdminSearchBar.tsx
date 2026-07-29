"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

/** Plain GET form — no Server Action involved, so search/filter state lives
 * in the URL (shareable, back-button-friendly) and list pages read it
 * straight off `searchParams`. Submitting always resets to page 1 since a
 * new query can change the result count. */
export function AdminSearchBar({
  basePath,
  q,
  status,
  statusOptions,
  searchPlaceholder,
}: {
  basePath: string;
  q: string;
  status: string;
  statusOptions: { value: string; label: string }[];
  searchPlaceholder: string;
}) {
  const hasFilters = q !== "" || status !== "";

  return (
    <form method="get" action={basePath} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1">
        <label className="mb-1.5 block text-xs text-muted-foreground" htmlFor="q">
          Search
        </label>
        <Input id="q" name="q" defaultValue={q} placeholder={searchPlaceholder} />
      </div>
      <div className="w-[180px]">
        <label className="mb-1.5 block text-xs text-muted-foreground" htmlFor="status">
          Status
        </label>
        <Select name="status" defaultValue={status || "all"}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" variant="outline" size="sm">
        Search
      </Button>
      {hasFilters && (
        <Button href={basePath} variant="ghost" size="sm">
          Clear
        </Button>
      )}
    </form>
  );
}

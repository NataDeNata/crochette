import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** Plain GET form — no Server Action involved, so search state lives in the URL
 * (shareable, back-button-friendly) and list pages read it straight off
 * `searchParams`. Submitting always resets to page 1 since a new query can
 * change the result count.
 *
 * The status dropdown that used to live here moved to AdminFilterTabs as part
 * of the 2026-07-30 redesign — a always-visible segmented control reads better
 * than a collapsed Select, and it made the current filter obvious at a glance.
 * That also let this drop `"use client"`: shadcn's Select was the only reason
 * it needed to be a client component, and a text input in a GET form does not.
 *
 * `hiddenParams` is what keeps the two composable: the active status (and
 * anything else in the URL) rides along as a hidden field, so submitting a
 * search never silently clears the filter the tabs are showing as selected. */
export function AdminSearchBar({
  basePath,
  q,
  searchPlaceholder,
  hiddenParams = {},
}: {
  basePath: string;
  q: string;
  searchPlaceholder: string;
  hiddenParams?: Record<string, string | undefined>;
}) {
  const hasFilters = q !== "" || Object.values(hiddenParams).some(Boolean);

  return (
    <form method="get" action={basePath} className="flex flex-wrap items-center gap-2">
      {Object.entries(hiddenParams).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      <Input
        id="q"
        name="q"
        defaultValue={q}
        placeholder={searchPlaceholder}
        aria-label="Search"
        className="min-w-[200px] flex-1 sm:max-w-[320px]"
      />
      <Button type="submit" variant="outline" size="sm">
        Search
      </Button>
      {hasFilters ? (
        <Button href={basePath} variant="ghost" size="sm">
          Clear
        </Button>
      ) : null}
    </form>
  );
}

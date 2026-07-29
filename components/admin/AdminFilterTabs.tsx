import Link from "next/link";

function buildHref(
  basePath: string,
  params: Record<string, string | undefined>,
  param: string,
  value: string | undefined,
) {
  const sp = new URLSearchParams();
  for (const [key, v] of Object.entries(params)) {
    if (v) sp.set(key, v);
  }
  if (value) sp.set(param, value);
  // `page` is deliberately never carried over: changing the filter changes the
  // result set, so page 4 of the old set is meaningless (and usually empty) in
  // the new one. Dropping it resets to page 1.
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export type FilterTabOption = {
  /** `undefined` is the "All" tab — it clears the param rather than setting it. */
  value?: string;
  label: string;
  /** Optional count suffix, e.g. Low stock (3). Hidden when 0. */
  count?: number;
};

/** The segmented filter control from the design, built as real `href` links
 * rather than the prototype's radio inputs.
 *
 * Links, not client state, for the same reason AdminPagination uses them: the
 * filter lives in the URL, so it survives a reload, is shareable, composes for
 * free with `?q=` and `?page=`, and needs no JS. The prototype's
 * `<input type="radio">` + `:has(input:checked)` styling would have made this a
 * client component holding state the server query already owns.
 *
 * `params` carries the *other* live params through (typically `q`), so
 * switching status never silently discards an active search. */
export function AdminFilterTabs({
  basePath,
  param,
  current,
  options,
  params = {},
}: {
  basePath: string;
  param: string;
  /** The active value; "" means the All tab is selected. */
  current: string;
  options: FilterTabOption[];
  params?: Record<string, string | undefined>;
}) {
  return (
    <div className="flex w-fit max-w-full flex-wrap items-center gap-1 overflow-hidden rounded-lg border border-border bg-card p-1">
      {options.map((opt) => {
        const active = (opt.value ?? "") === current;
        return (
          <Link
            key={opt.value ?? "__all"}
            href={buildHref(basePath, params, param, opt.value)}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-[13px] capitalize transition-colors ${
              active
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {opt.label}
            {opt.count ? <span className="ml-1.5 opacity-70">({opt.count})</span> : null}
          </Link>
        );
      })}
    </div>
  );
}

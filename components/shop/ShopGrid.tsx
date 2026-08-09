"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Cutout } from "@/components/ui/Cutout";
import { CATEGORIES, type Product, type ProductCategory } from "@/lib/data/products";
import {
  buildQuery,
  PAGE_SIZE,
  readCategory,
  readPage,
  readSort,
  selectProducts,
  SORTS,
  type Sort,
} from "@/lib/shop/query";
import { cn } from "@/lib/utils";

/* The query string is the state.
 *
 * Category, sort and page are read straight off the URL and changed by
 * navigating, so the back button, a bookmark and a pasted link all work with
 * no extra machinery — and a filtered view is something a shopper can send
 * someone. Only the search box keeps a local copy, because an input that waits
 * for a navigation between keystrokes feels broken; it mirrors itself into the
 * URL with `replace` so typing eight letters doesn't leave eight history
 * entries to back out of.
 *
 * The reading, writing and filtering all live in lib/shop/query.ts so they can
 * be tested without mounting React. */

/* The catalogue.
 *
 * `sheetNo()` used to live here, rendering pagination as "Press-out sheet
 * No. 03" on the argument that a paper-doll set genuinely came as numbered
 * sheets, so "which sheet am I on" and "which page am I on" were the same
 * question. The argument was sound and the result still failed: the number was
 * the answer to a question nobody had, printed above the heading, while the
 * pagination control at the foot of the page answered the real one in digits.
 * Both are gone; the count below the heading is what survived.
 *
 * Filtering, search and paging still run over the full catalogue client-side
 * at PAGE_SIZE 9 — but the state they read now lives in the query string
 * rather than in `useState`. See `buildQuery` above for why.
 */
export function ShopGrid({ products }: { products: Product[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  const active = readCategory(searchParams.get("category"));
  const sort = readSort(searchParams.get("sort"));
  const page = readPage(searchParams.get("page"));
  const urlQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(urlQuery);

  /* The last query string this component wrote. Anything else arriving in the
   * URL came from the browser — a back button, a pasted link — and the search
   * box has to follow it. */
  const written = useRef<string | null>(null);
  const pushNext = useRef(false);

  function go(next: Partial<{ active: ProductCategory | "all"; query: string; sort: Sort; page: number }>) {
    const q = buildQuery({ active, query, sort, page, ...next });
    written.current = q;
    const href = q ? `${pathname}?${q}` : pathname;
    // `scroll: false` — the results replace themselves in place, and yanking
    // the viewport to the top of the document on every filter click loses the
    // controls the shopper is using.
    if (pushNext.current) router.push(href, { scroll: false });
    else router.replace(href, { scroll: false });
    pushNext.current = false;
  }

  useEffect(() => {
    if (written.current === search) return;
    written.current = search;
    setQuery(new URLSearchParams(search).get("q") ?? "");
  }, [search]);

  // No useMemo: the React Compiler is on for this project and memoizes this
  // itself. A manual one here reads as caution and is actually the opposite —
  // it made the compiler skip optimizing the whole component.
  const filtered = selectProducts(products, { active, query, sort });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function selectCategory(value: ProductCategory | "all") {
    pushNext.current = true;
    go({ active: value, page: 1 });
  }

  return (
    <section className="bg-sheet">
      <div>
        <div className="page-gutter py-8 sm:py-10 lg:py-12">
          <div className="max-w-[1320px] mx-auto">
            <h1 className="type-sheet-display text-[clamp(34px,5.4vw,66px)] text-keyline text-balance max-w-[15ch]">
              The full collection
            </h1>
            <p className="text-[17px] text-muted-foreground max-w-[52ch] leading-[1.7] mt-5">
              Amigurumi, flowers and cozy decor. Every piece made by hand, in small
              batches.
            </p>

            {/* The colophon row that used to sit above the heading is gone with
                the rest of the press-sheet furniture. Its right-hand half was
                the one piece of it carrying a live fact — how many pieces the
                current filter matched — so that count moves here, below the
                heading and above the controls it actually describes, in plain
                words. The sheet number went entirely: it named the page you
                were on in a vocabulary the pagination below already states in
                digits. */}
            <p className="type-sheet-spec mt-6 text-keyline/60">
              {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
              {totalPages > 1 && ` · page ${currentPage} of ${totalPages}`}
            </p>

            {/* Controls. A search field and a row of filter tabs, both built
                from the sheet's own 2px keyline — square, unfilled at rest,
                butter when they are carrying the current state. */}
            <div className="mt-10 flex flex-col gap-5 border-y-2 border-keyline py-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
              <label className="relative flex w-full items-center lg:max-w-[320px]">
                <span className="sr-only">Search the collection</span>
                <Magnifier />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    go({ query: e.target.value, page: 1 });
                  }}
                  placeholder="Find a piece"
                  className="w-full border-2 border-keyline bg-sheet py-2.5 pl-10 pr-3 text-[15px] text-keyline [font-family:inherit] placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red"
                />
              </label>

              <label className="flex items-center gap-3 lg:order-3">
                <span className="type-sheet-spec text-keyline/60">Sort</span>
                <select
                  value={sort}
                  onChange={(e) => {
                    pushNext.current = true;
                    go({ sort: e.target.value as Sort, page: 1 });
                  }}
                  className="type-sheet-spec h-11 cursor-pointer border-2 border-keyline bg-sheet px-3 text-keyline [font-family:inherit] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-2 lg:order-2">
                {CATEGORIES.map((c) => {
                  const isActive = c.value === active;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => selectCategory(c.value)}
                      aria-pressed={isActive}
                      className={cn(
                        "type-sheet-spec cursor-pointer border-2 border-keyline px-3.5 py-2.5 transition-colors duration-200",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red",
                        isActive
                          ? "bg-butter text-keyline"
                          : "bg-sheet text-keyline/70 hover:bg-secondary hover:text-keyline",
                      )}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {visible.length === 0 ? (
              <EmptySheet query={query} />
            ) : (
              // `key` on the container, so changing filter, sort or page
              // remounts the grid and replays the entrance — which is what the
              // old AnimatePresence was for. The cards themselves are plain:
              // see `.sheet-reveal` in globals.css for why their visibility
              // must not depend on an animation running.
              <div
                key={`${active}-${sort}-${currentPage}-${query.trim()}`}
                className="sheet-reveal mt-12 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 sm:gap-x-8 lg:gap-x-12"
              >
                {visible.map((p, i) => (
                  // The top row is above the fold at every width this grid has
                  // (2 columns from 320px, 3 from 640px), so lazy-loading it
                  // delays the LCP image by design.
                  <Cutout key={p.id} product={p} priority={i < 3} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <nav
                aria-label="Pagination"
                className="mt-16 flex flex-wrap items-center gap-x-2 gap-y-3 border-t-2 border-keyline pt-6"
              >
                <span className="type-sheet-spec mr-2 text-keyline/60">
                  More pieces
                </span>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      pushNext.current = true;
                      go({ page: n });
                    }}
                    aria-current={n === currentPage ? "page" : undefined}
                    // The accessible name said "Sheet No. 02" while the button
                    // read "02" and the landmark was labelled "Sheets" — three
                    // names for a page control, none of them the word a screen
                    // reader user would expect. All three are plain now.
                    aria-label={`Page ${n}`}
                    className={cn(
                      "type-sheet-spec h-11 min-w-11 cursor-pointer border-2 border-keyline px-3 tabular-nums transition-colors duration-200",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red",
                      n === currentPage
                        ? "bg-butter text-keyline"
                        : "bg-sheet text-keyline/70 hover:bg-secondary hover:text-keyline",
                    )}
                  >
                    {String(n).padStart(2, "0")}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* The empty result is an uncut sheet: the die line is printed but nothing has
 * been pressed out of it. It says "there is nothing here" in the same drawing
 * the rest of the page is made of, and it names the recovery. */
function EmptySheet({ query }: { query: string }) {
  return (
    <div className="mt-14 flex flex-col items-center pb-6 text-center">
      <div className="diecut-arch aspect-4/5 w-[150px] border-2 border-dashed border-keyline/40" />
      <p className="type-sheet-display mt-7 text-[22px] text-keyline">
        Nothing on this sheet
      </p>
      <p className="mt-2 max-w-[42ch] text-[15px] leading-[1.6] text-muted-foreground">
        {query.trim()
          ? `No piece matches “${query.trim()}”. Try a shorter word, or clear the category filter.`
          : "No piece matches these filters yet. Try clearing the category filter."}
      </p>
    </div>
  );
}

/* Drawn at the keyline's weight, like every other mark in this world. */
function Magnifier() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="pointer-events-none absolute left-3 text-keyline"
    >
      <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="2" />
      <path d="m10.6 10.6 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

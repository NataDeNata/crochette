import { describe, expect, it } from "vitest";
import {
  buildQuery,
  readCategory,
  readPage,
  readSort,
  selectProducts,
  type ShopQuery,
} from "@/lib/shop/query";
import type { Product } from "@/lib/data/products";

/* The shop's filter, search, sort and page state moved into the query string,
 * which means it moved somewhere anyone can type. These cover the reading and
 * writing of that state; the reveal behaviour they sit under (a filtered card
 * must not wait for a scroll to become visible) is a render concern and has no
 * test here — this project mounts no React. */

function product(over: Partial<Product> & { id: string }): Product {
  return {
    slug: over.id,
    name: over.id,
    priceCents: 50000,
    category: "amigurumi",
    bgClassName: "",
    placeholder: "",
    stockQty: 3,
    images: [],
    ...over,
  };
}

const BASE: ShopQuery = { active: "all", query: "", sort: "newest", page: 1 };

describe("readCategory", () => {
  it("accepts a real category", () => {
    expect(readCategory("flowers")).toBe("flowers");
  });

  it("falls back to all for anything else", () => {
    // These arrive from the address bar, so "anything else" includes a
    // category that was renamed, a typo, and someone poking at it.
    expect(readCategory(null)).toBe("all");
    expect(readCategory("")).toBe("all");
    expect(readCategory("Flowers")).toBe("all");
    expect(readCategory("__proto__")).toBe("all");
  });

  it("does not accept 'all' spelled into the URL as a category value", () => {
    // It resolves to "all" either way — the point is that it round-trips to
    // an empty query rather than being written back as ?category=all.
    expect(buildQuery({ ...BASE, active: readCategory("all") })).toBe("");
  });
});

describe("readSort", () => {
  it("accepts the three real sorts", () => {
    expect(readSort("newest")).toBe("newest");
    expect(readSort("price-asc")).toBe("price-asc");
    expect(readSort("price-desc")).toBe("price-desc");
  });

  it("falls back to newest", () => {
    expect(readSort(null)).toBe("newest");
    expect(readSort("price")).toBe("newest");
  });
});

describe("readPage", () => {
  it("reads a positive integer", () => {
    expect(readPage("3")).toBe(3);
  });

  it("refuses anything that is not one", () => {
    expect(readPage(null)).toBe(1);
    expect(readPage("0")).toBe(1);
    expect(readPage("-3")).toBe(1);
    expect(readPage("2.5")).toBe(1);
    expect(readPage("two")).toBe(1);
    expect(readPage("1e3")).toBe(1000); // Number() accepts it and it is a valid page
  });
});

describe("buildQuery", () => {
  it("writes nothing for an unfiltered shop", () => {
    // /shop stays /shop. Otherwise the address bar fills with defaults on
    // first paint and the canonical URL disagrees with the visible one.
    expect(buildQuery(BASE)).toBe("");
  });

  it("writes only what differs from the default", () => {
    expect(buildQuery({ ...BASE, active: "flowers" })).toBe("category=flowers");
    expect(buildQuery({ ...BASE, sort: "price-asc" })).toBe("sort=price-asc");
    expect(buildQuery({ ...BASE, page: 2 })).toBe("page=2");
  });

  it("trims the search term", () => {
    expect(buildQuery({ ...BASE, query: "  bear  " })).toBe("q=bear");
    expect(buildQuery({ ...BASE, query: "   " })).toBe("");
  });

  it("round-trips through the readers", () => {
    const state: ShopQuery = { active: "baskets", query: "cloud", sort: "price-desc", page: 4 };
    const params = new URLSearchParams(buildQuery(state));
    expect({
      active: readCategory(params.get("category")),
      query: params.get("q") ?? "",
      sort: readSort(params.get("sort")),
      page: readPage(params.get("page")),
    }).toEqual(state);
  });
});

describe("selectProducts", () => {
  const catalogue = [
    product({ id: "cloud-basket", name: "Cloud Basket", category: "baskets", priceCents: 95000 }),
    product({ id: "daisy", name: "Sunny Daisy Bouquet", category: "flowers", priceCents: 68000 }),
    product({ id: "bee", name: "Bumble the Bee", category: "amigurumi", priceCents: 45000 }),
    product({ id: "rose", name: "Rosebud Coaster Set", category: "flowers", priceCents: 38000 }),
  ];

  it("filters by category", () => {
    const result = selectProducts(catalogue, { ...BASE, active: "flowers" });
    expect(result.map((p) => p.id).sort()).toEqual(["daisy", "rose"]);
  });

  it("searches names case-insensitively", () => {
    // The defect that started this: the count said one piece and the grid
    // showed ten. The count was always right, which is what proved the
    // filtering was.
    expect(selectProducts(catalogue, { ...BASE, query: "BEAR" })).toHaveLength(0);
    expect(selectProducts(catalogue, { ...BASE, query: "bee" }).map((p) => p.id)).toEqual(["bee"]);
    expect(selectProducts(catalogue, { ...BASE, query: "  daisy " }).map((p) => p.id)).toEqual([
      "daisy",
    ]);
  });

  it("combines category and search", () => {
    expect(
      selectProducts(catalogue, { ...BASE, active: "flowers", query: "rose" }).map((p) => p.id),
    ).toEqual(["rose"]);
  });

  it("sorts by price in both directions", () => {
    expect(selectProducts(catalogue, { ...BASE, sort: "price-asc" }).map((p) => p.priceCents)).toEqual(
      [38000, 45000, 68000, 95000],
    );
    expect(
      selectProducts(catalogue, { ...BASE, sort: "price-desc" }).map((p) => p.priceCents),
    ).toEqual([95000, 68000, 45000, 38000]);
  });

  it("reads newest as the catalogue order reversed", () => {
    // getProducts() returns createdAt asc, so the last row is the newest.
    expect(selectProducts(catalogue, BASE).map((p) => p.id)).toEqual([
      "rose",
      "bee",
      "daisy",
      "cloud-basket",
    ]);
  });

  it("does not mutate the array it was given", () => {
    const before = catalogue.map((p) => p.id);
    selectProducts(catalogue, { ...BASE, sort: "price-asc" });
    selectProducts(catalogue, BASE);
    expect(catalogue.map((p) => p.id)).toEqual(before);
  });
});

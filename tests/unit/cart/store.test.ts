import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { CartLine, CartView } from "@/lib/db/cart";

// Replaced wholesale, so the real "use server" module (and the database behind
// it) is never loaded. The store's contract with the server is the shape of
// these return values, and nothing more.
vi.mock("@/app/cart/actions", () => ({
  getCart: vi.fn(),
  addToCart: vi.fn(),
  setCartItemQuantity: vi.fn(),
  removeFromCart: vi.fn(),
  emptyCart: vi.fn(),
  importLegacyCart: vi.fn(),
}));

const actions = await import("@/app/cart/actions");
const { useCartStore } = await import("@/lib/cart/store");

const MILO: Omit<CartLine, "quantity"> = {
  productId: "p-milo",
  slug: "milo-the-bear",
  name: "Milo the Bear",
  priceCents: 120000,
  stockQty: 5,
};

function view(lines: CartLine[]): CartView {
  return {
    cartId: "cart-1",
    lines,
    subtotalCents: lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0),
    count: lines.reduce((sum, l) => sum + l.quantity, 0),
  };
}

/** The store is a module singleton, so each test has to start from scratch. */
function resetStore() {
  useCartStore.setState({ lines: [], subtotalCents: 0, count: 0, syncing: false, loaded: false });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetStore();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("initial state", () => {
  it("starts not loaded, so the UI can tell an empty cart from an unread one", () => {
    // This distinction is load-bearing: React runs child effects before parent
    // effects, so CheckoutForm's empty-cart guard sees an empty store on first
    // render. Without `loaded` it bounced every checkout back to /cart.
    const state = useCartStore.getState();
    expect(state.loaded).toBe(false);
    expect(state.lines).toEqual([]);
  });

  it("marks itself loaded once hydrated from the server", () => {
    useCartStore.getState().hydrate(view([{ ...MILO, quantity: 2 }]));

    const state = useCartStore.getState();
    expect(state.loaded).toBe(true);
    expect(state.count).toBe(2);
    expect(state.subtotalCents).toBe(240000);
  });
});

describe("add", () => {
  it("shows the line immediately, before the server responds", async () => {
    let resolveServer: (v: CartView) => void = () => {};
    vi.mocked(actions.addToCart).mockReturnValue(
      new Promise<CartView>((resolve) => {
        resolveServer = resolve;
      })
    );

    const pending = useCartStore.getState().add(MILO, 2);

    // Optimistic: asserted while the action is still in flight.
    expect(useCartStore.getState().count).toBe(2);
    expect(useCartStore.getState().syncing).toBe(true);

    resolveServer(view([{ ...MILO, quantity: 2 }]));
    await pending;

    expect(useCartStore.getState().syncing).toBe(false);
  });

  it("clamps the optimistic quantity to available stock", async () => {
    vi.mocked(actions.addToCart).mockResolvedValue(view([{ ...MILO, quantity: 5 }]));

    await useCartStore.getState().add(MILO, 99);

    expect(useCartStore.getState().lines[0].quantity).toBe(5);
  });

  it("increments an existing line rather than duplicating it", async () => {
    useCartStore.getState().hydrate(view([{ ...MILO, quantity: 1 }]));
    vi.mocked(actions.addToCart).mockResolvedValue(view([{ ...MILO, quantity: 3 }]));

    await useCartStore.getState().add(MILO, 2);

    expect(useCartStore.getState().lines).toHaveLength(1);
    expect(useCartStore.getState().lines[0].quantity).toBe(3);
  });

  it("ignores an add for a product with no stock", async () => {
    vi.mocked(actions.addToCart).mockResolvedValue(view([]));

    await useCartStore.getState().add({ ...MILO, stockQty: 0 }, 1);

    expect(useCartStore.getState().lines).toEqual([]);
  });

  it("replaces state with the server's answer rather than merging it", async () => {
    // A product drafted in /admin mid-session vanishes server-side; the client
    // must drop it too, not keep it because nothing said to remove it.
    useCartStore.getState().hydrate(view([{ ...MILO, quantity: 1 }]));
    vi.mocked(actions.addToCart).mockResolvedValue(view([]));

    await useCartStore.getState().add(MILO, 1);

    expect(useCartStore.getState().lines).toEqual([]);
    expect(useCartStore.getState().count).toBe(0);
  });

  it("keeps the optimistic state when the server call fails", async () => {
    // A network blip must not yank items out from under someone mid-edit.
    // Checkout re-reads the cart server-side, so a stale client can't overcharge.
    vi.mocked(actions.addToCart).mockRejectedValue(new Error("offline"));

    await useCartStore.getState().add(MILO, 2);

    expect(useCartStore.getState().count).toBe(2);
    expect(useCartStore.getState().syncing).toBe(false);
  });
});

describe("setQuantity — debounced per product", () => {
  it("updates the UI at once but waits before writing", async () => {
    useCartStore.getState().hydrate(view([{ ...MILO, quantity: 1 }]));
    vi.mocked(actions.setCartItemQuantity).mockResolvedValue(view([{ ...MILO, quantity: 4 }]));

    await useCartStore.getState().setQuantity(MILO.productId, 4);

    expect(useCartStore.getState().lines[0].quantity).toBe(4);
    expect(actions.setCartItemQuantity).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(400);

    expect(actions.setCartItemQuantity).toHaveBeenCalledExactlyOnceWith(MILO.productId, 4);
  });

  it("collapses a burst of stepper clicks into a single write of the final value", async () => {
    useCartStore.getState().hydrate(view([{ ...MILO, quantity: 1 }]));
    vi.mocked(actions.setCartItemQuantity).mockResolvedValue(view([{ ...MILO, quantity: 4 }]));

    for (const quantity of [2, 3, 4]) {
      await useCartStore.getState().setQuantity(MILO.productId, quantity);
      await vi.advanceTimersByTimeAsync(100);
    }
    await vi.advanceTimersByTimeAsync(400);

    expect(actions.setCartItemQuantity).toHaveBeenCalledExactlyOnceWith(MILO.productId, 4);
  });

  it("debounces per product id, so adjusting one row does not cancel another", async () => {
    const bear = { ...MILO, quantity: 1 };
    const basket: CartLine = {
      productId: "p-basket",
      slug: "cloud-basket",
      name: "Cloud Basket",
      priceCents: 38000,
      stockQty: 5,
      quantity: 1,
    };
    useCartStore.getState().hydrate(view([bear, basket]));
    vi.mocked(actions.setCartItemQuantity).mockResolvedValue(view([bear, basket]));

    await useCartStore.getState().setQuantity(bear.productId, 2);
    await useCartStore.getState().setQuantity(basket.productId, 3);
    await vi.advanceTimersByTimeAsync(400);

    expect(actions.setCartItemQuantity).toHaveBeenCalledTimes(2);
    expect(actions.setCartItemQuantity).toHaveBeenCalledWith(bear.productId, 2);
    expect(actions.setCartItemQuantity).toHaveBeenCalledWith(basket.productId, 3);
  });

  it("clamps to stock", async () => {
    useCartStore.getState().hydrate(view([{ ...MILO, quantity: 1 }]));
    vi.mocked(actions.setCartItemQuantity).mockResolvedValue(view([{ ...MILO, quantity: 5 }]));

    await useCartStore.getState().setQuantity(MILO.productId, 99);

    expect(useCartStore.getState().lines[0].quantity).toBe(5);
  });

  it("treats a quantity of zero as a removal", async () => {
    useCartStore.getState().hydrate(view([{ ...MILO, quantity: 2 }]));
    vi.mocked(actions.setCartItemQuantity).mockResolvedValue(view([]));

    await useCartStore.getState().setQuantity(MILO.productId, 0);

    expect(useCartStore.getState().lines).toEqual([]);
  });
});

describe("remove", () => {
  it("cancels a pending quantity write so the deleted line cannot come back", async () => {
    // The regression test for a real bug: a debounced write landing after the
    // delete re-created the row server-side.
    useCartStore.getState().hydrate(view([{ ...MILO, quantity: 1 }]));
    vi.mocked(actions.setCartItemQuantity).mockResolvedValue(view([{ ...MILO, quantity: 3 }]));
    vi.mocked(actions.removeFromCart).mockResolvedValue(view([]));

    await useCartStore.getState().setQuantity(MILO.productId, 3);
    await useCartStore.getState().remove(MILO.productId);
    await vi.advanceTimersByTimeAsync(1000);

    expect(actions.setCartItemQuantity).not.toHaveBeenCalled();
    expect(actions.removeFromCart).toHaveBeenCalledExactlyOnceWith(MILO.productId);
    expect(useCartStore.getState().lines).toEqual([]);
  });
});

describe("clear", () => {
  it("empties the cart and cancels every pending write", async () => {
    useCartStore.getState().hydrate(view([{ ...MILO, quantity: 2 }]));
    vi.mocked(actions.setCartItemQuantity).mockResolvedValue(view([{ ...MILO, quantity: 4 }]));
    vi.mocked(actions.emptyCart).mockResolvedValue(view([]));

    await useCartStore.getState().setQuantity(MILO.productId, 4);
    await useCartStore.getState().clear();
    await vi.advanceTimersByTimeAsync(1000);

    expect(actions.setCartItemQuantity).not.toHaveBeenCalled();
    expect(useCartStore.getState().count).toBe(0);
  });
});

describe("importLegacy", () => {
  const LEGACY_KEY = "crochette-cart";

  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends only ids and quantities, discarding the stale price the old cart carried", async () => {
    window.localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify([{ productId: "p-milo", quantity: 2, priceCents: 1, name: "stale" }])
    );
    vi.mocked(actions.importLegacyCart).mockResolvedValue(view([{ ...MILO, quantity: 2 }]));

    await useCartStore.getState().importLegacy();

    expect(actions.importLegacyCart).toHaveBeenCalledExactlyOnceWith([{ productId: "p-milo", quantity: 2 }]);
  });

  it("clears the key before the network call, so a failure cannot double quantities on retry", async () => {
    window.localStorage.setItem(LEGACY_KEY, JSON.stringify([{ productId: "p-milo", quantity: 2 }]));
    vi.mocked(actions.importLegacyCart).mockRejectedValue(new Error("offline"));

    await useCartStore.getState().importLegacy();

    expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it("does nothing when there is no legacy cart", async () => {
    await useCartStore.getState().importLegacy();
    expect(actions.importLegacyCart).not.toHaveBeenCalled();
  });

  it("discards a corrupt payload and removes the key rather than retrying forever", async () => {
    window.localStorage.setItem(LEGACY_KEY, "{not json");

    await useCartStore.getState().importLegacy();

    expect(actions.importLegacyCart).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it("skips entries missing an id", async () => {
    window.localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify([{ quantity: 2 }, { productId: "p-milo", quantity: 1 }])
    );
    vi.mocked(actions.importLegacyCart).mockResolvedValue(view([{ ...MILO, quantity: 1 }]));

    await useCartStore.getState().importLegacy();

    expect(actions.importLegacyCart).toHaveBeenCalledExactlyOnceWith([{ productId: "p-milo", quantity: 1 }]);
  });
});

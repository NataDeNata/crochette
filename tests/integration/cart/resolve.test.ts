import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { carts } from "@/lib/db/schema";
import { testDb } from "../helpers/db";

const cookieStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => void cookieStore.set(name, value),
    delete: (name: string) => void cookieStore.delete(name),
  }),
}));

const auth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => auth() }));

const { resolveCartId } = await import("@/lib/cart/resolve");
const { getOrCreateCustomerCart } = await import("@/lib/db/cart");
const { makeCart, makeCustomer } = await import("../helpers/factories");
const { setCartCookie } = await import("@/lib/cart/cookie");

beforeEach(() => {
  cookieStore.clear();
  auth.mockReset();
  auth.mockResolvedValue(null);
});

describe("guests", () => {
  it("does not mint a cart merely because a page was rendered", async () => {
    // create:false is the read path. A crawler hitting the site must not leave
    // a row behind, and Next forbids setting cookies during render anyway.
    expect(await resolveCartId({ create: false })).toBeNull();
  });

  it("creates a cart and a signed cookie on the first add-to-cart", async () => {
    const cartId = await resolveCartId({ create: true });

    expect(cartId).toBeTruthy();
    expect(cookieStore.get("crochette_cart")).toContain(`${cartId}.`);
  });

  it("reuses the cart named by the cookie on later requests", async () => {
    const first = await resolveCartId({ create: true });
    const second = await resolveCartId({ create: false });

    expect(second).toBe(first);
  });

  it("ignores a tampered cookie rather than handing a bad id to Postgres", async () => {
    const cart = await makeCart();
    cookieStore.set("crochette_cart", `${cart.id}.forgedsignature`);

    expect(await resolveCartId({ create: false })).toBeNull();
  });

  it("ignores a malformed cookie value", async () => {
    cookieStore.set("crochette_cart", "not-a-cart-id-at-all");
    expect(await resolveCartId({ create: false })).toBeNull();
  });

  it("mints a fresh cart when the cookie names one that has been deleted", async () => {
    const cart = await makeCart();
    await setCartCookie(cart.id);
    await testDb.delete(carts).where(eq(carts.id, cart.id));

    const resolved = await resolveCartId({ create: true });

    expect(resolved).not.toBe(cart.id);
    expect(resolved).toBeTruthy();
  });
});

describe("signed-in customers", () => {
  it("addresses the customer's own cart on the write path, ignoring the cookie", async () => {
    const customer = await makeCustomer();
    const guestCart = await makeCart();
    await setCartCookie(guestCart.id);
    auth.mockResolvedValue({ user: { id: customer.id, role: "customer" } });

    const resolved = await resolveCartId({ create: true });

    expect(resolved).not.toBe(guestCart.id);
    expect(resolved).toBe(await getOrCreateCustomerCart(customer.id));
  });

  it("treats an admin session as a guest — /admin has no cart", async () => {
    auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });

    const cartId = await resolveCartId({ create: true });

    expect(cartId).toBeTruthy();
    expect(cookieStore.get("crochette_cart")).toContain(`${cartId}.`);
  });

  /**
   * PINS CURRENT BEHAVIOUR, WHICH MAY BE A BUG.
   *
   * lib/cart/resolve.ts says a signed-in customer is "always addressed by
   * customer id, never by the cookie", and that holds on the write path above.
   * The read path (`create: false`) does not: it reads the cookie, so a customer
   * with no cart cookie — a second device, or cleared cookies — reads as having
   * an empty cart until their first write, even though the cart exists.
   *
   * In practice the cookie is usually correct, because merge-on-login writes the
   * surviving cart id back into it. This test records the gap rather than
   * asserting the documented intent, so a deliberate fix flips it loudly.
   */
  it("reads as empty on a device with no cart cookie, despite the cart existing", async () => {
    const customer = await makeCustomer();
    await getOrCreateCustomerCart(customer.id);
    auth.mockResolvedValue({ user: { id: customer.id, role: "customer" } });

    expect(await resolveCartId({ create: false })).toBeNull();
  });

  it("reads the customer's cart when the cookie points at it", async () => {
    const customer = await makeCustomer();
    const customerCartId = await getOrCreateCustomerCart(customer.id);
    await setCartCookie(customerCartId);
    auth.mockResolvedValue({ user: { id: customer.id, role: "customer" } });

    expect(await resolveCartId({ create: false })).toBe(customerCartId);
  });
});

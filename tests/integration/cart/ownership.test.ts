import { describe, expect, it } from "vitest";
import { addItem, createGuestCart, findCustomerCart, isGuestCart, mergeCarts } from "@/lib/db/cart";
import { makeCart, makeCustomer, makeProduct, readCartLines } from "../helpers/factories";

/**
 * Cart resolution used to ask only "does this cart exist?", never "whose is
 * it?". Combined with a cart cookie that was never cleared on sign-out — and
 * which holds the *customer's* cart id after a merge, not a guest one — that
 * let a shared browser carry one account's cart into the next person's session.
 *
 * These pin the ownership predicates that `resolveCartId` and `mergeCarts` now
 * depend on. `resolveCartId` itself needs a request scope (cookies + auth) so
 * it isn't directly callable here; what is testable, and what the bug actually
 * turned on, is the database-level question underneath it.
 */

describe("isGuestCart", () => {
  it("is true for an unclaimed cart", async () => {
    const cartId = await createGuestCart();
    expect(await isGuestCart(cartId)).toBe(true);
  });

  it("is false for a cart that belongs to an account", async () => {
    const customer = await makeCustomer();
    const cart = await makeCart(customer.id);

    // The whole bug in one assertion: cartExists said true here, so a stale
    // cookie naming this cart resolved and was served to whoever held it.
    expect(await isGuestCart(cart.id)).toBe(false);
  });

  it("is false for a cart id that no longer exists", async () => {
    const cartId = await createGuestCart();
    const customer = await makeCustomer();
    await mergeCarts(cartId, customer.id);

    expect(await isGuestCart(cartId)).toBe(false);
  });
});

describe("findCustomerCart", () => {
  it("returns the customer's own cart", async () => {
    const customer = await makeCustomer();
    const cart = await makeCart(customer.id);

    expect(await findCustomerCart(customer.id)).toBe(cart.id);
  });

  it("returns null rather than minting a cart for a customer without one", async () => {
    const customer = await makeCustomer();

    expect(await findCustomerCart(customer.id)).toBeNull();
    // The read path must never leave a row behind — that is why it is not
    // getOrCreateCustomerCart.
    expect(await findCustomerCart(customer.id)).toBeNull();
  });

  it("never returns another customer's cart", async () => {
    const a = await makeCustomer();
    const b = await makeCustomer();
    await makeCart(a.id);

    expect(await findCustomerCart(b.id)).toBeNull();
  });
});

describe("mergeCarts refuses a cart that already belongs to someone", () => {
  it("leaves the other account's cart intact instead of absorbing it", async () => {
    const product = await makeProduct({ stockQty: 10 });

    const victim = await makeCustomer();
    const victimCart = await makeCart(victim.id);
    await addItem(victimCart.id, product.id, 2);

    // Second person signs in on the same browser, whose cookie still names the
    // first person's cart. Previously this folded the victim's items into the
    // attacker's cart and then deleted the victim's cart outright.
    const attacker = await makeCustomer();
    const surviving = await mergeCarts(victimCart.id, attacker.id);

    expect(surviving).not.toBe(victimCart.id);
    expect(await readCartLines(surviving)).toHaveLength(0);

    // Victim's cart still exists, still theirs, still holding their items.
    expect(await findCustomerCart(victim.id)).toBe(victimCart.id);
    const victimLines = await readCartLines(victimCart.id);
    expect(victimLines).toHaveLength(1);
    expect(victimLines[0].quantity).toBe(2);
  });

  it("still merges a genuine guest cart", async () => {
    const product = await makeProduct({ stockQty: 10 });
    const guestCart = await makeCart();
    await addItem(guestCart.id, product.id, 3);

    const customer = await makeCustomer();
    const surviving = await mergeCarts(guestCart.id, customer.id);

    expect(surviving).toBe(await findCustomerCart(customer.id));
    const lines = await readCartLines(surviving);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(3);
    expect(await isGuestCart(guestCart.id)).toBe(false);
  });
});

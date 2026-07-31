import { describe, expect, it } from "vitest";
import { claimGuestOrders, getCustomerOrders } from "@/lib/db/accounts";
import { makeCustomer, makeOrder, readOrder } from "../helpers/factories";

/**
 * Attaching a shopper's past guest orders to their account.
 *
 * The bug this closes: a guest checkout stores `customer_id = null`, and
 * /account/orders queries strictly on `customer_id` — so signing in later with
 * the very same email showed an empty order list, with the order sitting
 * intact but unreachable.
 *
 * The claim matches on email, so half of these tests are about what it must
 * *refuse* to do. Those matter more than the happy path: the failure mode is
 * handing one person another person's name, phone number and home address.
 */
describe("claimGuestOrders", () => {
  it("claims a guest order whose email matches", async () => {
    const customer = await makeCustomer({ email: "shopper@example.test" });
    const order = await makeOrder({ customerEmail: "shopper@example.test", customerId: null });

    const claimed = await claimGuestOrders(customer.id, "shopper@example.test");

    expect(claimed).toBe(1);
    expect((await readOrder(order.id)).customerId).toBe(customer.id);
  });

  it("makes the order visible on the account orders page", async () => {
    const customer = await makeCustomer({ email: "shopper@example.test" });
    await makeOrder({ customerEmail: "shopper@example.test", customerId: null });

    // The actual reported symptom: empty before, present after.
    expect(await getCustomerOrders(customer.id)).toHaveLength(0);
    await claimGuestOrders(customer.id, "shopper@example.test");
    expect(await getCustomerOrders(customer.id)).toHaveLength(1);
  });

  it("matches case-insensitively", async () => {
    // orders.customer_email is only .trim()ed at checkout (lib/validation/
    // checkout.ts) while customers.email is always lowercased, so a plain `=`
    // would miss every shopper who capitalised anything.
    const customer = await makeCustomer({ email: "sam@example.test" });
    const order = await makeOrder({ customerEmail: "Sam@Example.Test", customerId: null });

    expect(await claimGuestOrders(customer.id, "sam@example.test")).toBe(1);
    expect((await readOrder(order.id)).customerId).toBe(customer.id);
  });

  it("never takes an order that already belongs to someone else", async () => {
    // The theft case. Two accounts, one address — whoever claimed it first
    // keeps it, because the update is scoped to `customer_id IS NULL`.
    const first = await makeCustomer({ email: "first@example.test" });
    const second = await makeCustomer({ email: "second@example.test" });
    const order = await makeOrder({ customerEmail: "shared@example.test", customerId: first.id });

    const claimed = await claimGuestOrders(second.id, "shared@example.test");

    expect(claimed).toBe(0);
    expect((await readOrder(order.id)).customerId).toBe(first.id);
  });

  it("leaves other people's guest orders alone", async () => {
    const customer = await makeCustomer({ email: "mine@example.test" });
    const theirs = await makeOrder({ customerEmail: "theirs@example.test", customerId: null });

    expect(await claimGuestOrders(customer.id, "mine@example.test")).toBe(0);
    expect((await readOrder(theirs.id)).customerId).toBeNull();
  });

  it("does not alter the order's own contact snapshot", async () => {
    // customerName/Email/Phone are the record of what was typed at checkout.
    // Claiming sets the account link and must touch nothing else.
    const customer = await makeCustomer({ email: "snap@example.test", name: "Account Name" });
    const order = await makeOrder({
      customerEmail: "Snap@Example.Test",
      customerName: "Checkout Name",
      customerId: null,
    });

    await claimGuestOrders(customer.id, "snap@example.test");

    const after = await readOrder(order.id);
    expect(after.customerName).toBe("Checkout Name");
    expect(after.customerEmail).toBe("Snap@Example.Test");
  });

  it("claims every matching guest order, and is safe to re-run", async () => {
    const customer = await makeCustomer({ email: "repeat@example.test" });
    await makeOrder({ customerEmail: "repeat@example.test", customerId: null });
    await makeOrder({ customerEmail: "repeat@example.test", customerId: null });

    expect(await claimGuestOrders(customer.id, "repeat@example.test")).toBe(2);
    // Re-running on the next sign-in finds nothing left and changes nothing.
    expect(await claimGuestOrders(customer.id, "repeat@example.test")).toBe(0);
    expect(await getCustomerOrders(customer.id)).toHaveLength(2);
  });
});

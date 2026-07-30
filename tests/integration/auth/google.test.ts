import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { lookupOrCreateGoogleCustomer } from "@/lib/db/accounts";
import { customers } from "@/lib/db/schema";
import { testDb } from "../helpers/db";
import { makeCustomer } from "../helpers/factories";

/**
 * The `customers` row behind a Google sign-in.
 *
 * The id assertions are the important ones. With no adapter and a JWT session,
 * whatever `profile()` returns becomes `session.user.id`, and every later
 * `customer_id` write uses it — so returning Google's `sub` instead of our uuid
 * would not fail at sign-in, it would fail much later at checkout with a 22P02,
 * the same shape as the Xendit `reference_id` bug. A uuid check here is the
 * cheapest possible guard against that.
 */
describe("lookupOrCreateGoogleCustomer", () => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  async function countByEmail(email: string) {
    const rows = await testDb.select().from(customers).where(eq(customers.email, email));
    return rows.length;
  }

  it("creates a passwordless account on first sign-in", async () => {
    const email = `google-new-${Date.now()}@example.test`;
    const customer = await lookupOrCreateGoogleCustomer({ email, name: "Ada" });

    expect(customer.id).toMatch(UUID);
    expect(customer.email).toBe(email);
    expect(customer.passwordHash).toBeNull();
    expect(customer.name).toBe("Ada");
  });

  it("returns the same row on a second sign-in rather than duplicating", async () => {
    const email = `google-repeat-${Date.now()}@example.test`;
    const first = await lookupOrCreateGoogleCustomer({ email, name: "Ada" });
    const second = await lookupOrCreateGoogleCustomer({ email, name: "Ada" });

    expect(second.id).toBe(first.id);
    expect(await countByEmail(email)).toBe(1);
  });

  it("links an existing password account instead of creating a second one", async () => {
    const existing = await makeCustomer({ name: "Existing Shopper" });
    const linked = await lookupOrCreateGoogleCustomer({ email: existing.email, name: "Google Name" });

    expect(linked.id).toBe(existing.id);
    expect(await countByEmail(existing.email)).toBe(1);
  });

  it("keeps the password on a linked account rather than clearing it", async () => {
    // Linking must not turn a password account into a Google-only one, or the
    // customer silently loses the ability to sign in the way they always have.
    const existing = await makeCustomer();
    await lookupOrCreateGoogleCustomer({ email: existing.email, name: "Google Name" });

    const [row] = await testDb.select().from(customers).where(eq(customers.id, existing.id));
    expect(row.passwordHash).toBe(existing.passwordHash);
  });

  it("does not overwrite a name the customer already set", async () => {
    const existing = await makeCustomer({ name: "Their Own Name" });
    const linked = await lookupOrCreateGoogleCustomer({ email: existing.email, name: "Google Name" });
    expect(linked.name).toBe("Their Own Name");
  });

  it("fills in a missing name from the Google profile", async () => {
    const existing = await makeCustomer({ name: null });
    const linked = await lookupOrCreateGoogleCustomer({ email: existing.email, name: "Google Name" });

    expect(linked.name).toBe("Google Name");
    const [row] = await testDb.select().from(customers).where(eq(customers.id, existing.id));
    expect(row.name).toBe("Google Name");
  });

  it("normalises the address so casing can't create a second account", async () => {
    const email = `Google-Case-${Date.now()}@Example.Test`;
    const first = await lookupOrCreateGoogleCustomer({ email });
    const second = await lookupOrCreateGoogleCustomer({ email: email.toLowerCase() });

    expect(second.id).toBe(first.id);
    expect(first.email).toBe(email.toLowerCase());
  });
});

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { addresses, customers, orders, type NewAddressRow } from "@/lib/db/schema";

export async function findCustomerByEmail(email: string) {
  const [row] = await db.select().from(customers).where(eq(customers.email, email.trim().toLowerCase())).limit(1);
  return row ?? null;
}

/**
 * Resolve the `customers` row behind a Google sign-in, creating it on first
 * use. Returns our own row — the uuid is the entire point (see lib/auth.ts).
 *
 * An existing password account with the same address is **linked, not
 * duplicated**. Google asserts `email_verified`, which is the standard bar for
 * this, and the caller enforces it before we ever get here. The consequence is
 * worth stating plainly: whoever controls the Google account controls the
 * Yarns and Buttons account. That is intended, and it is why the verified check is
 * mandatory rather than advisory.
 *
 * `name` only fills a gap — it never overwrites a name the customer set
 * themselves, since their own is the more deliberate of the two.
 */
export async function lookupOrCreateGoogleCustomer(data: { email: string; name?: string | null }) {
  const email = data.email.trim().toLowerCase();

  const existing = await findCustomerByEmail(email);
  if (existing) {
    if (!existing.name && data.name) {
      await db.update(customers).set({ name: data.name }).where(eq(customers.id, existing.id));
      return { ...existing, name: data.name };
    }
    return existing;
  }

  // passwordHash stays null: this account has no password until a reset flow
  // exists to give it one. See the column comment in lib/db/schema.ts.
  const [row] = await db
    .insert(customers)
    .values({ email, passwordHash: null, name: data.name || null })
    .returning();
  return row;
}

export async function createCustomer(data: { email: string; passwordHash: string; name?: string | null }) {
  const [row] = await db
    .insert(customers)
    .values({ email: data.email.trim().toLowerCase(), passwordHash: data.passwordHash, name: data.name || null })
    .returning();
  return row;
}

export async function listAddresses(customerId: string) {
  return db
    .select()
    .from(addresses)
    .where(eq(addresses.customerId, customerId))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
}

export async function getAddress(customerId: string, addressId: string) {
  const [row] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.customerId, customerId)))
    .limit(1);
  return row ?? null;
}

export async function createAddress(data: Omit<NewAddressRow, "id" | "createdAt">) {
  if (data.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.customerId, data.customerId));
  }
  const [row] = await db.insert(addresses).values(data).returning();
  return row;
}

export async function updateAddress(
  customerId: string,
  addressId: string,
  data: Partial<Omit<NewAddressRow, "id" | "customerId" | "createdAt">>
) {
  if (data.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.customerId, customerId));
  }
  await db
    .update(addresses)
    .set(data)
    .where(and(eq(addresses.id, addressId), eq(addresses.customerId, customerId)));
}

export async function deleteAddress(customerId: string, addressId: string) {
  await db.delete(addresses).where(and(eq(addresses.id, addressId), eq(addresses.customerId, customerId)));
}

/** Unsets any other default address for the customer and marks this one
 * default — a plain update (not createAddress/updateAddress's guard) since
 * this is called on an already-existing address specifically to flip it on. */
export async function setDefaultAddress(customerId: string, addressId: string) {
  await db.update(addresses).set({ isDefault: false }).where(eq(addresses.customerId, customerId));
  await db
    .update(addresses)
    .set({ isDefault: true })
    .where(and(eq(addresses.id, addressId), eq(addresses.customerId, customerId)));
}

/**
 * Attach a customer's own past guest orders to their account.
 *
 * The match is on email, so it is only ever safe where the email has been
 * **proven** to belong to the person signing in. Today that means Google
 * (`email_verified`, enforced in lib/auth.ts before a row is ever resolved) —
 * see the call site, which is what enforces the restriction. Password accounts
 * are deliberately excluded: nothing verifies their address yet, so matching on
 * it would let anyone sign up with someone else's email and read the name,
 * phone number and full shipping address off that person's guest orders.
 * When email verification ships, this becomes safe to call for them too and
 * the provider gate at the call site is the only thing that needs to change.
 *
 * `customerId IS NULL` is what makes this safe to re-run and impossible to use
 * for theft: an order that already belongs to an account is never reassigned,
 * so a second account claiming the same address cannot take orders off the
 * first. Only genuinely unclaimed guest orders move.
 *
 * Case-insensitive on purpose. `customers.email` is lowercased on every write,
 * but `orders.customerEmail` is only `.trim()`ed (lib/validation/checkout.ts),
 * so it holds whatever case the shopper typed — a plain `=` would silently miss
 * "Sam@Example.com".
 *
 * The order's own customerName/Email/Phone are **not** touched: they stay the
 * snapshot of what was typed at checkout, per the column comments in
 * lib/db/schema.ts. Only the account link is filled in.
 *
 * Returns how many orders were claimed, for logging.
 */
export async function claimGuestOrders(customerId: string, email: string) {
  const claimed = await db
    .update(orders)
    .set({ customerId })
    .where(
      and(
        isNull(orders.customerId),
        sql`lower(${orders.customerEmail}) = ${email.trim().toLowerCase()}`
      )
    )
    .returning({ id: orders.id });

  return claimed.length;
}

/** Orders belonging to the account: those placed while logged in, plus any
 * guest orders since claimed by a verified-email sign-in (claimGuestOrders
 * above). Both are the same thing by the time they get here — a row whose
 * `customerId` is set. */
export async function getCustomerOrders(customerId: string) {
  return db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
}

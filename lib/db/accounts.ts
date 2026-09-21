import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { addresses, customers, orders, type NewAddressRow } from "@/lib/db/schema";

export async function findCustomerByEmail(email: string) {
  const [row] = await db.select().from(customers).where(eq(customers.email, email.trim().toLowerCase())).limit(1);
  return row ?? null;
}

export async function findCustomerById(id: string) {
  const [row] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
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
 *
 * `emailVerifiedAt` is stamped here, on creation *and* on an existing row that
 * has never been stamped. Google asserts `email_verified` and the caller
 * hard-rejects anything else, so arriving through this function is itself the
 * proof — a Google customer should never be shown a "confirm your address"
 * banner, and should not have to click a link to claim their own guest orders
 * when the provider has already answered the question.
 */
export async function lookupOrCreateGoogleCustomer(data: { email: string; name?: string | null }) {
  const email = data.email.trim().toLowerCase();

  const existing = await findCustomerByEmail(email);
  if (existing) {
    const patch: { name?: string; emailVerifiedAt?: Date } = {};
    if (!existing.name && data.name) patch.name = data.name;
    if (!existing.emailVerifiedAt) patch.emailVerifiedAt = new Date();

    if (Object.keys(patch).length === 0) return existing;

    const [updated] = await db.update(customers).set(patch).where(eq(customers.id, existing.id)).returning();
    return updated;
  }

  // passwordHash stays null: this account has no password until the shopper
  // sets one through the reset flow (which treats a passwordless account as a
  // first-time set, not an error). See the column comment in lib/db/schema.ts.
  const [row] = await db
    .insert(customers)
    .values({ email, passwordHash: null, name: data.name || null, emailVerifiedAt: new Date() })
    .returning();
  return row;
}

/**
 * Stamp an address as proven, but only if it is still the account's address.
 *
 * The email comparison is the whole point of the guard, and it is why the
 * verification token binds the address it was minted for: without this, a token
 * minted for the address a shopper had last week would stamp `email_verified_at`
 * against whatever address the row carries today. Re-running it on an already
 * verified account is a no-op rather than a re-stamp, so the recorded time
 * stays the time the address was *first* proven and a replayed link is
 * harmless.
 *
 * Returns true when the account is verified as a result of this call *or* was
 * already — both are "the link worked" from the shopper's side. False means the
 * token pointed at an address the account no longer uses, which the caller
 * reports as a dead link.
 */
export async function markEmailVerified(customerId: string, email: string): Promise<boolean> {
  const customer = await findCustomerById(customerId);
  if (!customer) return false;
  if (customer.email !== email.trim().toLowerCase()) return false;
  if (customer.emailVerifiedAt) return true;

  await db.update(customers).set({ emailVerifiedAt: new Date() }).where(eq(customers.id, customerId));
  return true;
}

/**
 * Write a new password hash and advance `password_changed_at` in the same
 * statement.
 *
 * The two must move together. The stamp is what `lib/auth-session.ts` reads to
 * revoke sessions issued before the change, and what every outstanding reset
 * link is signed against — so a new hash stored without it would leave the old
 * sessions alive and the spent link still valid, which is precisely the pair of
 * failures the reset flow exists to prevent.
 */
export async function setCustomerPassword(customerId: string, passwordHash: string) {
  await db
    .update(customers)
    .set({ passwordHash, passwordChangedAt: new Date() })
    .where(eq(customers.id, customerId));
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
 * **proven** to belong to the person signing in. Two things now count as proof,
 * and both are enforced at the call sites rather than here: Google
 * (`email_verified`, enforced in lib/auth.ts before a row is ever resolved),
 * and a non-null `customers.email_verified_at` — the stamp Stage B's
 * verification link writes. An unverified password account is still excluded,
 * for the original reason: matching on an unproven address would let anyone
 * sign up with someone else's email and read the name, phone number and full
 * shipping address off that person's guest orders.
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

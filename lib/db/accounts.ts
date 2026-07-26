import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { addresses, customers, orders, type NewAddressRow } from "@/lib/db/schema";

export async function findCustomerByEmail(email: string) {
  const [row] = await db.select().from(customers).where(eq(customers.email, email.trim().toLowerCase())).limit(1);
  return row ?? null;
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

/** Orders placed while logged in — orders placed as a guest before signup
 * are never retroactively linked, by design (see lib/db/schema.ts). */
export async function getCustomerOrders(customerId: string) {
  return db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
}

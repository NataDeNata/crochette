import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { discountCodes } from "@/lib/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ResolvedDiscount = { id: string; discountCents: number };

/** Looks up a customer-entered code and validates it against the live DB —
 * active, not expired, under its usage cap, and the order meets its minimum
 * subtotal — then computes the discount in cents off the given subtotal.
 * Returns null for "no code entered", or an error string for an invalid one. */
export async function resolveDiscountCode(
  rawCode: string,
  subtotalCents: number
): Promise<{ discount: ResolvedDiscount | null; error?: string }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { discount: null };

  const [row] = await db.select().from(discountCodes).where(eq(discountCodes.code, code)).limit(1);

  if (!row || !row.active) {
    return { discount: null, error: "That discount code isn't valid." };
  }
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    return { discount: null, error: "That discount code has expired." };
  }
  if (row.maxUses != null && row.usedCount >= row.maxUses) {
    return { discount: null, error: "That discount code has reached its usage limit." };
  }
  if (row.minSubtotalCents != null && subtotalCents < row.minSubtotalCents) {
    return {
      discount: null,
      error: `That code needs a subtotal of at least ${(row.minSubtotalCents / 100).toFixed(2)} to apply.`,
    };
  }

  const discountCents =
    row.type === "percentage" ? Math.round((subtotalCents * row.value) / 100) : Math.min(row.value, subtotalCents);

  return { discount: { id: row.id, discountCents } };
}

/** Increments a code's usage count — called only on confirmed payment (the
 * Xendit webhook), the same "count it only once it's real" principle as
 * decrementStockForOrder in lib/db/inventory.ts.
 *
 * `resolveDiscountCode`'s maxUses check at checkout time is an unlocked
 * read, so concurrent checkouts can both pass it before either pays. This
 * can't undo a payment Xendit already confirmed, but the WHERE clause here
 * keeps usedCount itself from ever exceeding maxUses, and logs so an
 * over-redemption (payment succeeded past the cap) is visible instead of
 * silent. */
export async function incrementDiscountUsage(tx: Tx, discountCodeId: string) {
  const [row] = await tx
    .update(discountCodes)
    .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
    .where(
      and(
        eq(discountCodes.id, discountCodeId),
        or(isNull(discountCodes.maxUses), lt(discountCodes.usedCount, discountCodes.maxUses))
      )
    )
    .returning();

  if (!row) {
    console.warn(
      `discount code ${discountCodeId} was redeemed past its maxUses cap (a concurrent checkout raced past the checkout-time check) — the order was still paid, usedCount was not incremented further`
    );
  }
}

/** Reverses a code's usage count — called when an admin cancels/refunds a
 * paid order that used it (see app/admin/orders/actions.ts), the same
 * "undo what confirmed payment did" principle as restoreStockForOrder in
 * lib/db/inventory.ts. Clamped at 0 so it can never go negative. */
export async function decrementDiscountUsage(tx: Tx, discountCodeId: string) {
  await tx
    .update(discountCodes)
    .set({ usedCount: sql`GREATEST(${discountCodes.usedCount} - 1, 0)` })
    .where(eq(discountCodes.id, discountCodeId));
}

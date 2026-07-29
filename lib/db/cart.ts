import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./index";
import { carts, cartItems, products } from "./schema";

/** A cart line joined with the product data needed to render it.
 *
 * Everything except `quantity` is read live from `products` on every load, so a
 * price edit or a stock change in /admin is reflected the next time the cart is
 * read. Nothing here is stored on the cart row itself — see the schema comment
 * on `cartItems` for why. */
export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  stockQty: number;
  /** Quantity actually stored, already clamped to stock on write. */
  quantity: number;
};

export type CartView = {
  cartId: string;
  lines: CartLine[];
  subtotalCents: number;
  count: number;
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Tx | typeof db;

/** Clamp a requested quantity into what the catalogue can actually supply.
 * Returns 0 when the product is unavailable, which callers treat as "remove". */
function clampToStock(requested: number, stockQty: number): number {
  if (!Number.isFinite(requested)) return 0;
  return Math.max(0, Math.min(Math.trunc(requested), Math.max(0, stockQty)));
}

/** Touch `updated_at`. Called on every mutation so an eventual "abandoned cart"
 * job (Phase 2) has a real last-activity timestamp to work from rather than
 * having to infer one from the newest cart_items row. */
async function touchCart(exec: Executor, cartId: string): Promise<void> {
  await exec.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
}

/** The customer's cart, creating one if they don't have it yet.
 *
 * Uses ON CONFLICT on the customer_id unique index rather than a
 * select-then-insert, so two tabs signing in at once can't create two carts. */
export async function getOrCreateCustomerCart(customerId: string, exec: Executor = db): Promise<string> {
  const [row] = await exec
    .insert(carts)
    .values({ customerId })
    .onConflictDoUpdate({
      target: carts.customerId,
      // A no-op update is what makes RETURNING give back the existing row;
      // onConflictDoNothing returns nothing and would need a second query.
      set: { updatedAt: new Date() },
    })
    .returning({ id: carts.id });

  return row.id;
}

/** A fresh, unclaimed cart for a guest. The caller is responsible for putting
 * the returned id in the signed cookie. */
export async function createGuestCart(exec: Executor = db): Promise<string> {
  const [row] = await exec.insert(carts).values({}).returning({ id: carts.id });
  return row.id;
}

/** Whether a cart id actually exists. Guards against a stale cookie pointing at
 * a cart that was merged away or cascade-deleted with its customer. */
export async function cartExists(cartId: string, exec: Executor = db): Promise<boolean> {
  const [row] = await exec.select({ id: carts.id }).from(carts).where(eq(carts.id, cartId)).limit(1);
  return Boolean(row);
}

/** Read a cart with live product data.
 *
 * Only `active` products are returned. A line whose product was deleted,
 * drafted, or archived silently drops out rather than rendering a dead row the
 * checkout would reject anyway — the same "no longer available" condition
 * checkout already handles, caught one step earlier.
 *
 * Quantities are clamped to current stock on read as well as on write, because
 * stock can fall (another customer buys the last one) between the two. */
export async function getCartView(cartId: string, exec: Executor = db): Promise<CartView> {
  const rows = await exec
    .select({
      productId: products.id,
      slug: products.slug,
      name: products.name,
      priceCents: products.priceCents,
      stockQty: products.stockQty,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(and(eq(cartItems.cartId, cartId), eq(products.status, "active")))
    .orderBy(cartItems.addedAt);

  const lines: CartLine[] = [];
  for (const row of rows) {
    const quantity = clampToStock(row.quantity, row.stockQty);
    if (quantity > 0) lines.push({ ...row, quantity });
  }

  return {
    cartId,
    lines,
    subtotalCents: lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0),
    count: lines.reduce((sum, l) => sum + l.quantity, 0),
  };
}

/** Add to a cart, or increase an existing line.
 *
 * The upsert is a single statement so two tabs adding the same product can't
 * lose one another's increment. The clamp is applied inside SQL via LEAST so
 * the ceiling is evaluated against the same snapshot the write uses. */
export async function addItem(
  cartId: string,
  productId: string,
  quantity: number,
  exec: Executor = db,
): Promise<void> {
  const requested = Math.trunc(quantity);
  if (!Number.isFinite(requested) || requested <= 0) return;

  const [product] = await exec
    .select({ stockQty: products.stockQty })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.status, "active")))
    .limit(1);

  // Unknown, drafted or sold-out product: nothing to add. Deliberately silent —
  // the caller re-reads the cart afterwards and the UI reconciles from that.
  if (!product) return;

  const initial = clampToStock(requested, product.stockQty);
  if (initial <= 0) return;

  await exec
    .insert(cartItems)
    .values({ cartId, productId, quantity: initial })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.productId],
      set: {
        quantity: sql`LEAST(${cartItems.quantity} + ${initial}, ${product.stockQty})`,
      },
    });

  await touchCart(exec, cartId);
}

/** Set an exact quantity. Zero or less removes the line, matching the old
 * client-side setQuantity contract so the UI layer needs no special case. */
export async function setItemQuantity(
  cartId: string,
  productId: string,
  quantity: number,
  exec: Executor = db,
): Promise<void> {
  const [product] = await exec
    .select({ stockQty: products.stockQty })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  const next = product ? clampToStock(quantity, product.stockQty) : 0;

  if (next <= 0) {
    await removeItem(cartId, productId, exec);
    return;
  }

  await exec
    .update(cartItems)
    .set({ quantity: next })
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)));

  await touchCart(exec, cartId);
}

export async function removeItem(cartId: string, productId: string, exec: Executor = db): Promise<void> {
  await exec
    .delete(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)));
  await touchCart(exec, cartId);
}

/** Empty a cart without deleting it, so the cookie stays valid. */
export async function clearCart(cartId: string, exec: Executor = db): Promise<void> {
  await exec.delete(cartItems).where(eq(cartItems.cartId, cartId));
  await touchCart(exec, cartId);
}

/**
 * Fold a guest cart into a customer's cart on login, and delete the guest cart.
 *
 * Quantities are SUMMED and then clamped to stock — 2 in the guest cart plus 1
 * already saved gives 3, or the stock ceiling if that is lower. Summing is the
 * behaviour a shopper expects: nothing they added silently disappears.
 *
 * Runs in one transaction so a failure part-way can't leave items in both carts
 * (a double-count on retry) or in neither. Returns the surviving cart id, which
 * the caller writes back into the cookie.
 *
 * Safe to call when there is no guest cart, when the guest cart is empty, or
 * when guest and customer cart are already the same row — all no-op to just
 * returning the customer's cart id.
 *
 * Takes an optional executor like every other function here, and that matters
 * for more than tests: unconditionally opening its own `db.transaction` meant
 * that calling this from inside a caller's transaction used a second connection
 * which then blocked on the `carts` unique index the outer transaction already
 * held — a deadlock that resolves only by statement timeout (SQLSTATE 57014).
 * Passing an executor keeps the whole merge on one connection.
 */
export async function mergeCarts(
  guestCartId: string | null,
  customerId: string,
  exec?: Executor,
): Promise<string> {
  // Own transaction only when the caller isn't already in one — the merge must
  // be atomic either way, or a failure part-way leaves items double-counted in
  // both carts or lost from both.
  if (!exec) return db.transaction((tx) => mergeCarts(guestCartId, customerId, tx));

  const tx = exec;
  {
    const customerCartId = await getOrCreateCustomerCart(customerId, tx);
    if (!guestCartId || guestCartId === customerCartId) return customerCartId;

    // A stale cookie can outlive its cart; treat that as "no guest cart".
    if (!(await cartExists(guestCartId, tx))) return customerCartId;

    const guestLines = await tx
      .select({ productId: cartItems.productId, quantity: cartItems.quantity })
      .from(cartItems)
      .where(eq(cartItems.cartId, guestCartId));

    if (guestLines.length > 0) {
      const stockRows = await tx
        .select({ id: products.id, stockQty: products.stockQty })
        .from(products)
        .where(
          and(
            inArray(
              products.id,
              guestLines.map((l) => l.productId),
            ),
            eq(products.status, "active"),
          ),
        );
      const stockById = new Map(stockRows.map((p) => [p.id, p.stockQty]));

      for (const line of guestLines) {
        const stockQty = stockById.get(line.productId);
        // Product went away or was drafted while the guest shopped — drop it
        // rather than carry a line checkout would refuse.
        if (stockQty === undefined) continue;

        const quantity = clampToStock(line.quantity, stockQty);
        if (quantity <= 0) continue;

        await tx
          .insert(cartItems)
          .values({ cartId: customerCartId, productId: line.productId, quantity })
          .onConflictDoUpdate({
            target: [cartItems.cartId, cartItems.productId],
            set: { quantity: sql`LEAST(${cartItems.quantity} + ${quantity}, ${stockQty})` },
          });
      }
    }

    // cart_items cascades from this delete.
    await tx.delete(carts).where(eq(carts.id, guestCartId));
    await touchCart(tx, customerCartId);

    return customerCartId;
  }
}

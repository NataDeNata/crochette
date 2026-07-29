import { testDb } from "./db";
import {
  addresses,
  admins,
  cartItems,
  carts,
  customers,
  discountCodes,
  orderItems,
  orders,
  products,
  type CartRow,
  type CustomerRow,
  type DiscountCodeRow,
  type NewDiscountCodeRow,
  type NewOrderRow,
  type NewProductRow,
  type OrderRow,
  type ProductRow,
} from "@/lib/db/schema";

/**
 * Row builders for integration tests.
 *
 * Defaults are deliberately NON-ZERO — particularly `stockQty`. The 2026-07-29
 * cart verification wasted a run on fixtures that happened to have zero stock,
 * which made every clamp assertion compare `min(n, 0)` against an empty cart and
 * pass trivially. A test about clamping must set the stock it is clamping to.
 */

let counter = 0;
const unique = () => `${Date.now().toString(36)}-${++counter}`;

export async function makeProduct(overrides: Partial<NewProductRow> = {}): Promise<ProductRow> {
  const suffix = unique();
  const [row] = await testDb
    .insert(products)
    .values({
      slug: `test-product-${suffix}`,
      name: `Test Product ${suffix}`,
      description: "A test piece.",
      priceCents: 120000,
      category: "amigurumi",
      status: "active",
      stockQty: 10,
      lowStockThreshold: 3,
      ...overrides,
    })
    .returning();
  return row;
}

export async function makeCustomer(overrides: Partial<CustomerRow> = {}): Promise<CustomerRow> {
  const [row] = await testDb
    .insert(customers)
    .values({
      email: `customer-${unique()}@example.test`,
      // Not a real hash — no test authenticates through bcrypt.
      passwordHash: "$2a$12$notarealhashusedonlyintests000000000000000000000000",
      name: "Test Customer",
      ...overrides,
    })
    .returning();
  return row;
}

export async function makeAdmin(): Promise<{ id: string; email: string }> {
  const [row] = await testDb
    .insert(admins)
    .values({
      email: `admin-${unique()}@example.test`,
      passwordHash: "$2a$12$notarealhashusedonlyintests000000000000000000000000",
      name: "Test Admin",
    })
    .returning();
  return row;
}

export async function makeAddress(customerId: string, overrides: Record<string, unknown> = {}) {
  const [row] = await testDb
    .insert(addresses)
    .values({
      customerId,
      label: "Home",
      line1: "12 Mabini Street",
      city: "Quezon City",
      province: "Metro Manila",
      postalCode: "1100",
      isDefault: false,
      ...overrides,
    })
    .returning();
  return row;
}

/** A guest cart when `customerId` is omitted — an unclaimed row IS the
 * anonymous cart, which is the whole identity mechanism. */
export async function makeCart(customerId?: string): Promise<CartRow> {
  const [row] = await testDb
    .insert(carts)
    .values({ customerId: customerId ?? null })
    .returning();
  return row;
}

export async function addCartLine(cartId: string, productId: string, quantity: number) {
  const [row] = await testDb.insert(cartItems).values({ cartId, productId, quantity }).returning();
  return row;
}

export async function makeDiscount(
  overrides: Partial<NewDiscountCodeRow> = {}
): Promise<DiscountCodeRow> {
  const [row] = await testDb
    .insert(discountCodes)
    .values({
      code: `TEST-${unique().toUpperCase()}`,
      type: "percentage",
      value: 10,
      active: true,
      usedCount: 0,
      ...overrides,
    })
    .returning();
  return row;
}

/**
 * An order plus its line items. Totals are computed from the items so a fixture
 * can't quietly describe an arithmetically impossible order.
 */
export async function makeOrder(
  {
    items = [],
    shippingCents = 10000,
    discountCents = 0,
    ...overrides
  }: Partial<NewOrderRow> & {
    items?: Array<{ productId: string; productName?: string; unitPriceCents: number; quantity: number }>;
  } = {}
): Promise<OrderRow> {
  const subtotalCents = items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);

  const [order] = await testDb
    .insert(orders)
    .values({
      customerName: "Nata",
      customerEmail: "buyer@example.test",
      shippingLine1: "12 Mabini Street",
      shippingCity: "Quezon City",
      shippingProvince: "Metro Manila",
      shippingPostalCode: "1100",
      subtotalCents,
      shippingCents,
      discountCents,
      totalCents: subtotalCents + shippingCents - discountCents,
      status: "pending",
      ...overrides,
    })
    .returning();

  if (items.length > 0) {
    await testDb.insert(orderItems).values(
      items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName ?? "Test Product",
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
      }))
    );
  }

  return order;
}

/** Re-read a product straight from the database — the point of most assertions
 * here is what production code actually committed, not what it returned. */
export async function readProduct(id: string): Promise<ProductRow> {
  const row = await testDb.query.products.findFirst({ where: (p, { eq }) => eq(p.id, id) });
  if (!row) throw new Error(`product ${id} not found`);
  return row;
}

export async function readOrder(id: string): Promise<OrderRow> {
  const row = await testDb.query.orders.findFirst({ where: (o, { eq }) => eq(o.id, id) });
  if (!row) throw new Error(`order ${id} not found`);
  return row;
}

export async function readDiscount(id: string): Promise<DiscountCodeRow> {
  const row = await testDb.query.discountCodes.findFirst({ where: (d, { eq }) => eq(d.id, id) });
  if (!row) throw new Error(`discount ${id} not found`);
  return row;
}

export async function readCartLines(cartId: string) {
  return testDb.query.cartItems.findMany({
    where: (ci, { eq }) => eq(ci.cartId, cartId),
  });
}

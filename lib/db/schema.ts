import { pgTable, text, integer, timestamp, pgEnum, uuid, boolean } from "drizzle-orm/pg-core";

export const productCategoryEnum = pgEnum("product_category", [
  "amigurumi",
  "flowers",
  "home-decor",
  "baskets",
]);

export const productStatusEnum = pgEnum("product_status", ["active", "draft", "sold_out"]);

export const customOrderStatusEnum = pgEnum("custom_order_status", [
  "new",
  "quoted",
  "accepted",
  "in_production",
  "shipped",
  "completed",
  "declined",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "failed",
  "shipped",
  "completed",
  "cancelled",
]);

export const discountTypeEnum = pgEnum("discount_type", ["percentage", "fixed"]);

/** Phase 3 "discount codes/promotions" — redeemed at checkout, see
 * checkout/actions.ts. usedCount only increments on confirmed payment (the
 * Xendit webhook), mirroring how product stock is decremented, so an
 * abandoned checkout never burns a redemption. */
export const discountCodes = pgTable("discount_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  type: discountTypeEnum("type").notNull(),
  /** percentage: whole-number percent off (1-100). fixed: cents off. */
  value: integer("value").notNull(),
  active: boolean("active").notNull().default(true),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  minSubtotalCents: integer("min_subtotal_cents"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Mirrors lib/data/products.ts — seeded from the mock catalog. Storefront reads
 * still come from the mock module until a live DATABASE_URL is wired in. */
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  category: productCategoryEnum("category").notNull(),
  tag: text("tag"),
  status: productStatusEnum("status").notNull().default("active"),
  stockQty: integer("stock_qty").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customOrderRequests = pgTable("custom_order_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** Nullable — set only when the customer was logged in when submitting.
   * Guest submissions (name/email typed freeform below) stay fully supported. */
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  pieceType: text("piece_type").notNull(),
  preferredSize: text("preferred_size"),
  preferredColors: text("preferred_colors"),
  description: text("description").notNull(),
  budgetRange: text("budget_range"),
  referenceImageUrls: text("reference_image_urls").array(),
  status: customOrderStatusEnum("status").notNull().default("new"),
  quotedPriceCents: integer("quoted_price_cents"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** Nullable — set only when the customer was logged in at checkout. Guest
   * checkout stays fully supported; customerName/Email/Phone below remain
   * the source of truth for the order regardless (a snapshot, same as
   * order_items.productName), never backfilled from the account later. */
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  shippingLine1: text("shipping_line1").notNull(),
  shippingLine2: text("shipping_line2"),
  shippingCity: text("shipping_city").notNull(),
  shippingProvince: text("shipping_province").notNull(),
  shippingPostalCode: text("shipping_postal_code").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  shippingCents: integer("shipping_cents").notNull(),
  discountCents: integer("discount_cents").notNull().default(0),
  discountCodeId: uuid("discount_code_id").references(() => discountCodes.id, { onDelete: "set null" }),
  totalCents: integer("total_cents").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  xenditPaymentSessionId: text("xendit_payment_session_id"),
  xenditPaymentId: text("xendit_payment_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  /** Snapshot at purchase time — product name/price may change later. */
  productName: text("product_name").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  quantity: integer("quantity").notNull(),
});

/** Studio-owner login for /admin — not a customer-facing users table.
 * See `customers` below for the customer-facing accounts table. */
export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Customer-facing login (Phase 2 "customer accounts") — separate from
 * `admins` above; a different NextAuth Credentials provider (id: "customer")
 * authenticates against this table. Email/password only for now. */
export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Saved shipping addresses for a customer account. Purely a convenience
 * for prefilling checkout — orders always snapshot their own shipping
 * fields regardless of whether they came from a saved address. */
export const addresses = pgTable("addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  label: text("label"),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  province: text("province").notNull(),
  postalCode: text("postal_code").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
export type CustomOrderRequestRow = typeof customOrderRequests.$inferSelect;
export type NewCustomOrderRequestRow = typeof customOrderRequests.$inferInsert;
export type ContactMessageRow = typeof contactMessages.$inferSelect;
export type NewContactMessageRow = typeof contactMessages.$inferInsert;
export type AdminRow = typeof admins.$inferSelect;
export type NewAdminRow = typeof admins.$inferInsert;
export type CustomerRow = typeof customers.$inferSelect;
export type NewCustomerRow = typeof customers.$inferInsert;
export type AddressRow = typeof addresses.$inferSelect;
export type NewAddressRow = typeof addresses.$inferInsert;
export type OrderRow = typeof orders.$inferSelect;
export type NewOrderRow = typeof orders.$inferInsert;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type NewOrderItemRow = typeof orderItems.$inferInsert;
export type DiscountCodeRow = typeof discountCodes.$inferSelect;
export type NewDiscountCodeRow = typeof discountCodes.$inferInsert;

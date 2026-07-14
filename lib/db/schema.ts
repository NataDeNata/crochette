import { pgTable, text, integer, timestamp, pgEnum, uuid } from "drizzle-orm/pg-core";

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
 * Customer accounts are explicitly deferred (Phase 1 ships guest-only). */
export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
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
export type OrderRow = typeof orders.$inferSelect;
export type NewOrderRow = typeof orders.$inferInsert;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type NewOrderItemRow = typeof orderItems.$inferInsert;

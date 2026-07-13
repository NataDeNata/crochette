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
  status: customOrderStatusEnum("status").notNull().default("new"),
  quotedPriceCents: integer("quoted_price_cents"),
  adminNotes: text("admin_notes"),
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

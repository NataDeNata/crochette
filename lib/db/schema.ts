import { pgTable, text, integer, timestamp, pgEnum, uuid, boolean, uniqueIndex } from "drizzle-orm/pg-core";

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
  /** Admin-facing restock trigger — per-product, because items sell at very
   * different rates. Exact semantics live in `lowStockCondition`
   * (lib/db/inventory.ts); 0 disables the alert for this product. Deliberately
   * NOT the same number as `LOW_STOCK_THRESHOLD` in lib/data/products.ts, which
   * is the customer-facing storefront urgency badge. Keep this default in sync
   * with DEFAULT_LOW_STOCK_THRESHOLD in lib/validation/product.ts. */
  lowStockThreshold: integer("low_stock_threshold").notNull().default(3),
  /* The three facts a shopper needs to buy a handmade piece sight-unseen, and
   * that a one-sentence description cannot carry: how big it is, what it is
   * made of, and how to look after it. Free text rather than structured
   * fields (no `width_cm`/`height_cm`) because the studio owner types these by
   * hand per piece and "about 18cm tall, sitting" is more useful to a shopper
   * than two numbers that imply a precision hand-crochet does not have.
   *
   * All three nullable, all three rendered only when set, so a product with
   * none of them looks exactly as it did before rather than showing empty
   * rows — the catalogue is filled in over time, not in one sitting.
   * Migration 0015. */
  dimensions: text("dimensions"),
  materials: text("materials"),
  careInstructions: text("care_instructions"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Multiple real photos per product, admin-managed. `galleryFeatured`/
 * `galleryOrder` are independent of `position` — an image can be reordered
 * within its own product without affecting its place (or presence) in the
 * site-wide curated gallery at /gallery. */
export const productImages = pgTable("product_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
  isPrimary: boolean("is_primary").notNull().default(false),
  caption: text("caption"),
  alt: text("alt"),
  galleryFeatured: boolean("gallery_featured").notNull().default(false),
  galleryOrder: integer("gallery_order"),
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
  /** Nullable — set at checkout when the customer was logged in, or filled in
   * later by claimGuestOrders() when they sign in with a *verified* email that
   * matches a guest order's (lib/db/accounts.ts; Google-only for now, see the
   * gate in lib/auth.ts's events.signIn). Guest checkout stays fully supported.
   *
   * customerName/Email/Phone below remain the source of truth for the order
   * regardless (a snapshot, same as order_items.productName) and are never
   * backfilled from the account — claiming an order sets this column and
   * nothing else. */
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
  trackingNumber: text("tracking_number"),
  carrier: text("carrier"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
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
  /** Set by `npm run db:seed-admin` and by the self-service change-password
   * form (/admin/settings) on every password change. Sessions issued before
   * this instant are rejected in lib/auth.ts's jwt callback, which is what
   * makes rotating the password actually revoke live logins — a JWT session is
   * otherwise valid until it expires no matter what the row says.
   * Null means "never rotated", the correct reading for pre-existing rows. */
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  /** The TOTP seed, AES-256-GCM encrypted under a key derived from
   * `AUTH_SECRET` — see lib/security/secret-box.ts for why this one credential
   * is encrypted rather than hashed. Non-null with a null `totpConfirmedAt`
   * means an enrolment was started and never finished; that state is not
   * enforced at login and is simply overwritten by the next attempt. */
  totpSecret: text("totp_secret"),
  /** When the enrolment was confirmed with a working code. **This column, not
   * `totpSecret`, is what turns the second factor on** — an unconfirmed secret
   * would otherwise lock the owner out of an authenticator they never
   * successfully scanned. Null means no second factor. */
  totpConfirmedAt: timestamp("totp_confirmed_at", { withTimezone: true }),
  /** SHA-256 hashes of the unused single-use backup codes. Entries are removed
   * as they are spent, so the array length *is* the remaining count. Not
   * bcrypt, deliberately — see lib/security/totp.ts. */
  totpBackupCodes: text("totp_backup_codes").array(),
});

/** Customer-facing login (Phase 2 "customer accounts") — separate from
 * `admins` above; a different NextAuth Credentials provider (id: "customer")
 * authenticates against this table. Email/password only for now. */
export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  /** Nullable since Google sign-in landed: an account created through Google
   * has no password at all. The customer Credentials provider treats a null
   * hash exactly like a missing account — same dummy-hash comparison, same
   * generic failure — so "password sign-in on a Google-only account" can't
   * throw, and can't be told apart from a wrong password. */
  passwordHash: text("password_hash"),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /** Mirrors `admins.passwordChangedAt` above, but is **not yet enforced**:
   * customers have no way to change a password today (self-service change and
   * reset are both still open scope), so there is nothing to revoke, and
   * checking it would cost a DB lookup per request for every shopper in
   * exchange for nothing. The column exists now so the reset flow doesn't need
   * its own migration; switch the check on — throttled — when that lands. */
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
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

/** Server-owned shopping cart, replacing the localStorage-only cart.
 *
 * `customerId` is NULLABLE and that is the whole anonymity mechanism: a guest's
 * cart is simply a row nobody has claimed yet, addressed by a signed httpOnly
 * cookie holding this id. No second identity system is involved — see
 * lib/cart/cookie.ts. On login the guest cart is merged into the customer's and
 * deleted (`mergeCarts` in lib/db/cart.ts).
 *
 * A customer has at most one cart, enforced by a unique index rather than by
 * convention, so a merge race can't leave two live carts behind. Postgres
 * treats NULLs as distinct in a unique index, so this constrains logged-in
 * carts only and leaves any number of guest carts alone — which is exactly
 * what's wanted. */
export const carts = pgTable(
  "carts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("carts_customer_id_unique").on(t.customerId)],
);

/** A line in a cart.
 *
 * Deliberately stores ONLY product_id and quantity. The old client-side
 * CartItem also carried name/slug/priceCents/stockQty, which are snapshots that
 * go stale the moment a product is edited — a cart could show a price checkout
 * would then refuse. Display data is joined from `products` on read instead.
 * Same rule checkout already enforces: the client never supplies prices.
 *
 * Contrast `order_items`, which DOES snapshot name and price. That is correct
 * there and wrong here: an order must record what was actually charged.
 *
 * The (cart_id, product_id) unique constraint makes "add to cart" a real upsert
 * rather than a read-then-write, which would race against a second tab. */
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("cart_items_cart_id_product_id_unique").on(t.cartId, t.productId)],
);

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
export type ProductImageRow = typeof productImages.$inferSelect;
export type NewProductImageRow = typeof productImages.$inferInsert;
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
export type CartRow = typeof carts.$inferSelect;
export type NewCartRow = typeof carts.$inferInsert;
export type CartItemRow = typeof cartItems.$inferSelect;
export type NewCartItemRow = typeof cartItems.$inferInsert;

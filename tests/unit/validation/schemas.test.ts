import { describe, expect, it } from "vitest";
import { productSchema, DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/validation/product";
import { discountSchema } from "@/lib/validation/discount";
import { checkoutSchema } from "@/lib/validation/checkout";
import { signupSchema, loginSchema } from "@/lib/validation/account";
import { orderUpdateSchema } from "@/lib/validation/order-admin";
import { products } from "@/lib/db/schema";
import { getTableColumns } from "drizzle-orm";

/** Field-error lookup mirroring how the Server Actions read them. */
function errorsFor(result: { success: boolean; error?: { flatten(): { fieldErrors: Record<string, string[] | undefined> } } }) {
  return result.error?.flatten().fieldErrors ?? {};
}

const validProduct = {
  name: "Milo the Bear",
  slug: "milo-the-bear",
  description: "A small bear.",
  priceDollars: "1200",
  category: "amigurumi",
  status: "active",
  stockQty: "4",
  lowStockThreshold: "3",
};

describe("productSchema", () => {
  it("accepts a well-formed product and coerces the numeric strings a form submits", () => {
    const parsed = productSchema.parse(validProduct);
    expect(parsed.priceDollars).toBe(1200);
    expect(parsed.stockQty).toBe(4);
    expect(parsed.lowStockThreshold).toBe(3);
  });

  it.each([
    ["Milo The Bear", "uppercase"],
    ["milo_the_bear", "underscores"],
    ["-milo", "a leading hyphen"],
    ["milo--bear", "a doubled hyphen"],
    ["milo the bear", "spaces"],
  ])("rejects the slug %s (%s)", (slug) => {
    expect(errorsFor(productSchema.safeParse({ ...validProduct, slug })).slug).toBeDefined();
  });

  it("accepts a lowStockThreshold of 0, the documented way to disable the alert", () => {
    expect(productSchema.parse({ ...validProduct, lowStockThreshold: "0" }).lowStockThreshold).toBe(0);
  });

  it("accepts a threshold above current stock — that state is exactly what should be alerting", () => {
    const parsed = productSchema.parse({ ...validProduct, stockQty: "1", lowStockThreshold: "300" });
    expect(parsed.lowStockThreshold).toBe(300);
  });

  it("rejects a zero or negative price", () => {
    expect(productSchema.safeParse({ ...validProduct, priceDollars: "0" }).success).toBe(false);
    expect(productSchema.safeParse({ ...validProduct, priceDollars: "-1" }).success).toBe(false);
  });

  it("rejects a fractional stock quantity", () => {
    expect(productSchema.safeParse({ ...validProduct, stockQty: "1.5" }).success).toBe(false);
  });

  it("keeps DEFAULT_LOW_STOCK_THRESHOLD in step with the products table default", () => {
    // The two are deliberately duplicated rather than imported across the
    // client/schema boundary (see the comment in lib/validation/product.ts), so
    // nothing but this assertion stops them drifting apart.
    const columnDefault = getTableColumns(products).lowStockThreshold.default;
    expect(DEFAULT_LOW_STOCK_THRESHOLD).toBe(columnDefault);
  });
});

const validDiscount = {
  code: "summer-25",
  description: "",
  type: "percentage",
  value: "25",
  active: "on",
  maxUses: "",
  minSubtotalDollars: "",
  expiresAt: "",
};

describe("discountSchema", () => {
  it("uppercases the code, matching how it is stored and looked up", () => {
    expect(discountSchema.parse(validDiscount).code).toBe("SUMMER-25");
  });

  it("rejects codes with characters outside letters, numbers and hyphens", () => {
    expect(errorsFor(discountSchema.safeParse({ ...validDiscount, code: "SUMMER 25" })).code).toBeDefined();
    expect(errorsFor(discountSchema.safeParse({ ...validDiscount, code: "SUMMER_25" })).code).toBeDefined();
  });

  it("requires a percentage discount to be a whole number of 100 or less", () => {
    expect(discountSchema.safeParse({ ...validDiscount, value: "12.5" }).success).toBe(false);
    expect(discountSchema.safeParse({ ...validDiscount, value: "101" }).success).toBe(false);
    expect(discountSchema.safeParse({ ...validDiscount, value: "100" }).success).toBe(true);
  });

  it("allows a fixed discount to carry a fractional currency amount", () => {
    const parsed = discountSchema.parse({ ...validDiscount, type: "fixed", value: "50.50" });
    expect(parsed.value).toBe(50.5);
  });

  it("rejects a zero value for either type", () => {
    expect(discountSchema.safeParse({ ...validDiscount, value: "0" }).success).toBe(false);
    expect(discountSchema.safeParse({ ...validDiscount, type: "fixed", value: "0" }).success).toBe(false);
  });
});

describe("checkoutSchema", () => {
  const validCheckout = {
    name: "Nata",
    email: "buyer@example.com",
    shippingLine1: "12 Mabini Street",
    shippingCity: "Quezon City",
    shippingProvince: "Metro Manila",
    shippingPostalCode: "1100",
  };

  it("accepts an order with every optional field omitted", () => {
    expect(checkoutSchema.safeParse(validCheckout).success).toBe(true);
  });

  it("trims surrounding whitespace rather than storing it", () => {
    const parsed = checkoutSchema.parse({ ...validCheckout, name: "  Nata  " });
    expect(parsed.name).toBe("Nata");
  });

  it("rejects a whitespace-only required field", () => {
    expect(checkoutSchema.safeParse({ ...validCheckout, shippingCity: "   " }).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(errorsFor(checkoutSchema.safeParse({ ...validCheckout, email: "buyer@" })).email).toBeDefined();
  });
});

describe("account schemas", () => {
  const validSignup = {
    name: "Nata",
    email: "buyer@example.com",
    password: "correcthorse",
    confirmPassword: "correcthorse",
  };

  it("attaches a password mismatch to confirmPassword, where the form renders it", () => {
    const errors = errorsFor(signupSchema.safeParse({ ...validSignup, confirmPassword: "different" }));
    expect(errors.confirmPassword).toEqual(["Passwords don't match"]);
  });

  it("requires at least 8 characters", () => {
    const errors = errorsFor(
      signupSchema.safeParse({ ...validSignup, password: "short", confirmPassword: "short" })
    );
    expect(errors.password).toBeDefined();
  });

  it("does not impose the signup length rule on login, so existing passwords still work", () => {
    expect(loginSchema.safeParse({ email: "buyer@example.com", password: "x" }).success).toBe(true);
  });
});

describe("orderUpdateSchema", () => {
  it.each(["shipped", "completed", "cancelled"])("allows the admin to set %s", (status) => {
    expect(orderUpdateSchema.safeParse({ status }).success).toBe(true);
  });

  it.each(["pending", "paid", "failed"])("refuses %s, which is webhook-owned", (status) => {
    expect(orderUpdateSchema.safeParse({ status }).success).toBe(false);
  });
});

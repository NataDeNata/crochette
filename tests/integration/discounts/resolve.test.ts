import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  decrementDiscountUsage,
  incrementDiscountUsage,
  resolveDiscountCode,
} from "@/lib/db/discounts";
import { makeDiscount, readDiscount } from "../helpers/factories";

const SUBTOTAL = 120000; // ₱1,200

describe("resolveDiscountCode — lookup", () => {
  it("resolves a valid percentage code", async () => {
    const code = await makeDiscount({ code: "SUMMER25", type: "percentage", value: 25 });

    const { discount, error } = await resolveDiscountCode("SUMMER25", SUBTOTAL);

    expect(error).toBeUndefined();
    expect(discount).toEqual({ id: code.id, discountCents: 30000 });
  });

  it("normalizes case and surrounding whitespace, since customers type it by hand", async () => {
    await makeDiscount({ code: "SUMMER25", type: "percentage", value: 25 });

    const { discount } = await resolveDiscountCode("  summer25  ", SUBTOTAL);

    expect(discount?.discountCents).toBe(30000);
  });

  it("treats an empty code as no code, not as an error", async () => {
    // The field is optional at checkout — an untouched input must not block it.
    for (const input of ["", "   "]) {
      const { discount, error } = await resolveDiscountCode(input, SUBTOTAL);
      expect(discount).toBeNull();
      expect(error).toBeUndefined();
    }
  });

  it("rejects an unknown code", async () => {
    const { discount, error } = await resolveDiscountCode("NOPE", SUBTOTAL);

    expect(discount).toBeNull();
    expect(error).toBe("That discount code isn't valid.");
  });
});

describe("resolveDiscountCode — validity rules", () => {
  it("rejects an inactive code", async () => {
    await makeDiscount({ code: "OFF", active: false });

    expect((await resolveDiscountCode("OFF", SUBTOTAL)).error).toBe("That discount code isn't valid.");
  });

  it("rejects an expired code", async () => {
    await makeDiscount({ code: "OFF", expiresAt: new Date(Date.now() - 60_000) });

    expect((await resolveDiscountCode("OFF", SUBTOTAL)).error).toBe("That discount code has expired.");
  });

  it("accepts a code expiring in the future", async () => {
    await makeDiscount({ code: "OFF", expiresAt: new Date(Date.now() + 60_000) });

    expect((await resolveDiscountCode("OFF", SUBTOTAL)).discount).not.toBeNull();
  });

  it("rejects a code that has reached its usage cap", async () => {
    await makeDiscount({ code: "OFF", maxUses: 2, usedCount: 2 });

    expect((await resolveDiscountCode("OFF", SUBTOTAL)).error).toBe(
      "That discount code has reached its usage limit."
    );
  });

  it("accepts a code one redemption below its cap", async () => {
    await makeDiscount({ code: "OFF", maxUses: 2, usedCount: 1 });

    expect((await resolveDiscountCode("OFF", SUBTOTAL)).discount).not.toBeNull();
  });

  it("treats a null cap as unlimited", async () => {
    await makeDiscount({ code: "OFF", maxUses: null, usedCount: 9999 });

    expect((await resolveDiscountCode("OFF", SUBTOTAL)).discount).not.toBeNull();
  });

  it("rejects an order below the code's minimum subtotal", async () => {
    await makeDiscount({ code: "OFF", minSubtotalCents: 200000 });

    const { error } = await resolveDiscountCode("OFF", SUBTOTAL);

    expect(error).toContain("at least");
  });

  it("accepts an order exactly at the minimum subtotal", async () => {
    await makeDiscount({ code: "OFF", minSubtotalCents: SUBTOTAL });

    expect((await resolveDiscountCode("OFF", SUBTOTAL)).discount).not.toBeNull();
  });
});

describe("resolveDiscountCode — amounts", () => {
  it("rounds a percentage to the nearest centavo", async () => {
    await makeDiscount({ code: "OFF", type: "percentage", value: 33 });

    // 33% of 12345 is 4073.85
    expect((await resolveDiscountCode("OFF", 12345)).discount?.discountCents).toBe(4074);
  });

  it("applies a fixed discount in cents", async () => {
    await makeDiscount({ code: "OFF", type: "fixed", value: 20000 });

    expect((await resolveDiscountCode("OFF", SUBTOTAL)).discount?.discountCents).toBe(20000);
  });

  it("caps a fixed discount at the subtotal, so an order can never go negative", async () => {
    await makeDiscount({ code: "OFF", type: "fixed", value: 500000 });

    expect((await resolveDiscountCode("OFF", SUBTOTAL)).discount?.discountCents).toBe(SUBTOTAL);
  });

  it("allows a 100% code to bring the goods to zero", async () => {
    await makeDiscount({ code: "OFF", type: "percentage", value: 100 });

    expect((await resolveDiscountCode("OFF", SUBTOTAL)).discount?.discountCents).toBe(SUBTOTAL);
  });
});

describe("incrementDiscountUsage", () => {
  it("counts a redemption", async () => {
    const code = await makeDiscount({ usedCount: 0, maxUses: 5 });

    await db.transaction((tx) => incrementDiscountUsage(tx, code.id));

    expect((await readDiscount(code.id)).usedCount).toBe(1);
  });

  it("refuses to push usedCount past maxUses", async () => {
    // resolveDiscountCode's cap check is an unlocked read, so two concurrent
    // checkouts can both pass it. This WHERE clause is what stops the counter
    // itself from ever exceeding the cap.
    const code = await makeDiscount({ usedCount: 2, maxUses: 2 });

    await db.transaction((tx) => incrementDiscountUsage(tx, code.id));

    expect((await readDiscount(code.id)).usedCount).toBe(2);
  });

  it("keeps counting when there is no cap", async () => {
    const code = await makeDiscount({ usedCount: 100, maxUses: null });

    await db.transaction((tx) => incrementDiscountUsage(tx, code.id));

    expect((await readDiscount(code.id)).usedCount).toBe(101);
  });
});

describe("decrementDiscountUsage", () => {
  it("gives a redemption back when a paid order is cancelled", async () => {
    const code = await makeDiscount({ usedCount: 3 });

    await db.transaction((tx) => decrementDiscountUsage(tx, code.id));

    expect((await readDiscount(code.id)).usedCount).toBe(2);
  });

  it("clamps at zero rather than going negative", async () => {
    const code = await makeDiscount({ usedCount: 0 });

    await db.transaction((tx) => decrementDiscountUsage(tx, code.id));

    expect((await readDiscount(code.id)).usedCount).toBe(0);
  });
});

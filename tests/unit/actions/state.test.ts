import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  fieldError,
  INVALID_FIELDS_MESSAGE,
  invalidFields,
  RATE_LIMITED_MESSAGE,
  rateLimited,
} from "@/lib/actions/types";

const schema = z.object({ name: z.string().min(1), email: z.email() });

/** The `!parsed.success` branch these replace was written out longhand in
 * fourteen actions, and the message in sixteen. */
describe("invalidFields", () => {
  it("carries the field errors from the Zod error", () => {
    const parsed = schema.safeParse({ name: "", email: "nope" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const state = invalidFields(parsed.error);
    expect(state.status).toBe("error");
    expect(state.message).toBe(INVALID_FIELDS_MESSAGE);
    expect(state.fieldErrors?.name?.length).toBeGreaterThan(0);
    expect(state.fieldErrors?.email?.length).toBeGreaterThan(0);
  });

  it("merges the echoed values the storefront forms refill from", () => {
    const parsed = schema.safeParse({ name: "", email: "nope" });
    if (parsed.success) throw new Error("expected a parse failure");

    const values = { name: "", email: "nope" };
    expect(invalidFields(parsed.error, { values }).values).toEqual(values);
  });
});

describe("fieldError", () => {
  it("builds the same shape for a check Zod did not make", () => {
    expect(fieldError("discountCode", "That code has expired.")).toEqual({
      status: "error",
      message: INVALID_FIELDS_MESSAGE,
      fieldErrors: { discountCode: ["That code has expired."] },
    });
  });
});

describe("rateLimited", () => {
  it("is one wording for all eight endpoints that return it", () => {
    expect(rateLimited()).toEqual({ status: "error", message: RATE_LIMITED_MESSAGE });
  });

  it("keeps the echoed values, so a throttled checkout does not empty the form", () => {
    const values = { name: "Ana", shippingCity: "Cebu" };
    expect(rateLimited({ values }).values).toEqual(values);
  });
});

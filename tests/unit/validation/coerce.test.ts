import { describe, expect, it } from "vitest";
import { blankToCents, blankToNull } from "@/lib/validation/coerce";

/**
 * The case that matters is `""`. A cleared number input posts an empty string,
 * which is not nullish — so `?? null` lets it reach a numeric column, and the
 * three call sites that inlined this all wrote the `=== "" || === undefined`
 * pair out by hand.
 */
describe("blankToNull", () => {
  it.each([
    ["an empty string", "" as const],
    ["undefined", undefined],
  ])("maps %s to null", (_label, value) => {
    expect(blankToNull(value)).toBeNull();
  });

  it.each([0, 1, 250, -5, 0.5])("passes %d through unchanged", (value) => {
    expect(blankToNull(value)).toBe(value);
  });

  it("keeps zero, which is a real value and not a blank", () => {
    expect(blankToNull(0)).toBe(0);
  });
});

describe("blankToCents", () => {
  it.each([
    ["an empty string", "" as const],
    ["undefined", undefined],
  ])("maps %s to null", (_label, value) => {
    expect(blankToCents(value)).toBeNull();
  });

  it.each([
    [0, 0],
    [1, 100],
    [250, 25000],
    [19.99, 1999],
  ])("converts ₱%d to %d centavos", (pesos, cents) => {
    expect(blankToCents(pesos)).toBe(cents);
  });

  // 8.7 * 100 is 869.9999999999999. Truncating would bill a centavo less on
  // every price ending in .7, which is why this rounds.
  it("absorbs the float error that raw multiplication leaves behind", () => {
    expect(blankToCents(8.7)).toBe(870);
    expect(blankToCents(1.1)).toBe(110);
  });

  /* Half a centavo is not resolvable and is not claimed to be: 1.005 * 100 is
     100.49999999999999, so this rounds *down*. Pinned as the known behaviour
     rather than fixed — the price inputs are two-decimal pesos, so a third
     decimal never reaches here, and this carries the same arithmetic the four
     inlined `Math.round(x * 100)` call sites always had. */
  it("does not resolve a half centavo, and does not pretend to", () => {
    expect(blankToCents(1.005)).toBe(100);
  });
});

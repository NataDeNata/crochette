import { describe, expect, it } from "vitest";
import { mintOrderToken, verifyOrderToken } from "@/lib/security/order-token";

/**
 * Lets a guest reach their own order confirmation with no session. That makes
 * it a bearer credential scoped to one order id, so the tests that matter are
 * the negative ones: a token minted for a different order, a re-signed or
 * edited token, or an expired one, must be worth nothing.
 */
describe("order token", () => {
  const orderId = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
  const otherOrderId = "00000000-0000-0000-0000-000000000000";
  const now = 1_700_000_000_000;

  it("round-trips for the order it was minted for", () => {
    expect(verifyOrderToken(mintOrderToken(orderId, now), orderId, now + 1000)).toBe(true);
  });

  it("rejects a token presented for a different order", () => {
    // The attack this exists to stop: hold a valid token for your own order,
    // present it while browsing someone else's order id.
    const token = mintOrderToken(orderId, now);
    expect(verifyOrderToken(token, otherOrderId, now + 1000)).toBe(false);
  });

  it("rejects a token whose order id was swapped but kept the same signature slot", () => {
    const token = mintOrderToken(orderId, now);
    const [, expiresAt, signature] = token.split(".");
    const forged = [otherOrderId, expiresAt, signature].join(".");
    expect(verifyOrderToken(forged, otherOrderId, now + 1000)).toBe(false);
  });

  it("expires", () => {
    const token = mintOrderToken(orderId, now);
    const almostSixMonths = 179 * 24 * 60 * 60 * 1000;
    const overSixMonths = 181 * 24 * 60 * 60 * 1000;
    // Still good well within the window…
    expect(verifyOrderToken(token, orderId, now + almostSixMonths)).toBe(true);
    // …and worthless once it's run out. A leaked email link doesn't stay live forever.
    expect(verifyOrderToken(token, orderId, now + overSixMonths)).toBe(false);
  });

  it("rejects a token whose expiry was extended", () => {
    const token = mintOrderToken(orderId, now);
    const [id, , signature] = token.split(".");
    const forged = [id, String(now + 365 * 24 * 60 * 60 * 1000), signature].join(".");
    expect(verifyOrderToken(forged, orderId, now + 1000)).toBe(false);
  });

  it("rejects an unsigned or malformed token", () => {
    for (const bad of ["", orderId, `${orderId}.${now + 1000}`, "a.b.c", `${orderId}.${now + 1000}.`]) {
      expect(verifyOrderToken(bad, orderId, now)).toBe(false);
    }
  });

  it("rejects a non-numeric expiry", () => {
    // Guards against `Number("later")` → NaN sliding past a naive `now < exp`
    // comparison, which is false for NaN either way — but worth pinning.
    const forged = `${orderId}.later.${mintOrderToken(orderId, now).split(".")[2]}`;
    expect(verifyOrderToken(forged, orderId, now)).toBe(false);
  });

  it("issues a different token for a different mint time", () => {
    expect(mintOrderToken(orderId, now)).not.toBe(mintOrderToken(orderId, now + 1));
  });
});

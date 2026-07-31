import { describe, expect, it, vi } from "vitest";

// The module constructs an Upstash client at import time. Nothing here calls
// Redis — these assert the limit *table*, which is plain configuration.
vi.mock("@upstash/redis", () => ({ Redis: class {} }));
vi.mock("@upstash/ratelimit", () => ({ Ratelimit: class { static slidingWindow = () => ({}); } }));

const { RATE_LIMITS } = await import("@/lib/security/rate-limit");

/**
 * The IP-only bucket is the half of the enumeration fix that lives in
 * configuration rather than code: `lib/auth.ts`'s constant-time compare closes
 * the timing signal, and this closes the "just use a different email each
 * probe" escape from the per-endpoint `IP:email` limits. A merge that drops the
 * scope would leave the timing fix looking complete while the cheaper attack
 * still worked, which is why it is worth a test this small.
 */
describe("RATE_LIMITS", () => {
  it("defines the IP-only auth scope", () => {
    expect(RATE_LIMITS["auth-ip"]).toEqual({ max: 20, window: "10 m" });
  });

  it("defines the authorize() backstop as its own scope", () => {
    // Must not share a scope with auth-ip: the form path spends a token in
    // both, so sharing one would halve every limit without saying so.
    expect(RATE_LIMITS["auth-endpoint"]).toEqual({ max: 20, window: "10 m" });
    expect(RATE_LIMITS["auth-endpoint"]).not.toBe(RATE_LIMITS["auth-ip"]);
  });

  it("still covers every endpoint the 2026-07-27 plan scoped", () => {
    expect(Object.keys(RATE_LIMITS).sort()).toEqual(
      [
        "admin-login",
        "admin-totp",
        "auth-endpoint",
        "auth-ip",
        "checkout",
        "contact",
        "custom-order",
        "login",
        "signup",
      ].sort()
    );
  });

  it("caps second-factor guesses tighter than password attempts", () => {
    // A 6-digit code is one in a million and the ±1 drift window makes three
    // live at once, so the online guess only stays hopeless while the attempt
    // count stays small. Asserted as a relationship rather than a number so
    // this fails if someone loosens it to match admin-login.
    expect(RATE_LIMITS["admin-totp"].max).toBeLessThan(RATE_LIMITS["auth-ip"].max);
  });

  it.each(Object.entries(RATE_LIMITS))("%s has a positive max and a parseable window", (_scope, limit) => {
    expect(limit.max).toBeGreaterThan(0);
    expect(limit.window).toMatch(/^\d+ [smh]$/);
  });
});

import { describe, expect, it, vi } from "vitest";

// The module constructs an Upstash client at import time. Nothing here calls
// Redis — these assert the limit *table*, which is plain configuration.
vi.mock("@upstash/redis", () => ({ Redis: class {} }));
vi.mock("@upstash/ratelimit", () => ({ Ratelimit: class { static slidingWindow = () => ({}); } }));

// Mutable header set the mocked `headers()` returns, so each getClientIp test
// can stage exactly the forwarding headers a request would arrive with.
let mockHeaders = new Headers();
vi.mock("next/headers", () => ({ headers: async () => mockHeaders }));

const { RATE_LIMITS, getClientIp } = await import("@/lib/security/rate-limit");

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

/**
 * The rate-limit key must come from a header the *platform* sets, never from a
 * position the client controls. The original code read `x-forwarded-for`'s
 * leftmost entry — but Vercel appends the real connecting IP to whatever XFF the
 * client sent, so the leftmost value is attacker-supplied. Keying on it let one
 * caller mint a fresh bucket per request by rotating the header, silently
 * defeating every IP-keyed limit. These pin the fix: prefer `x-real-ip`, else
 * the *rightmost* XFF entry.
 */
describe("getClientIp", () => {
  it("prefers x-real-ip, which Vercel sets and overwrites", async () => {
    mockHeaders = new Headers({ "x-real-ip": "198.51.100.7", "x-forwarded-for": "1.2.3.4" });
    expect(await getClientIp()).toBe("198.51.100.7");
  });

  it("takes the LAST x-forwarded-for entry, not the client-injected first one", async () => {
    // A request arriving as `<spoofed>, <real ip>` — the value Vercel appended
    // is the trustworthy one, and it is last.
    mockHeaders = new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" });
    expect(await getClientIp()).toBe("203.0.113.9");
  });

  it("cannot be moved off a bucket by prepending a spoofed hop", async () => {
    // The whole point: two requests from the same real client resolve to the
    // same key however the attacker decorates the left of the header.
    mockHeaders = new Headers({ "x-forwarded-for": "9.9.9.9, 203.0.113.9" });
    const a = await getClientIp();
    mockHeaders = new Headers({ "x-forwarded-for": "8.8.8.8, 203.0.113.9" });
    const b = await getClientIp();
    expect(a).toBe(b);
    expect(a).toBe("203.0.113.9");
  });

  it("falls back to a constant when no forwarding header is present", async () => {
    mockHeaders = new Headers({ host: "localhost:3000" });
    expect(await getClientIp()).toBe("unknown");
  });
});

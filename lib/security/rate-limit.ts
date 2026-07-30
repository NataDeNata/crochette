import { headers } from "next/headers";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

/** Vercel sets x-forwarded-for on every request; falls back to a constant
 * so local dev (no proxy) still gets a stable, if shared, rate-limit key. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

// Vercel's Upstash-for-Redis marketplace integration provisions
// KV_REST_API_URL/KV_REST_API_TOKEN (legacy @vercel/kv naming), not the
// UPSTASH_REDIS_REST_* names Redis.fromEnv() looks for.
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

/** Per-scope sliding-window limits, decided 2026-07-23 (see update.md):
 * checkout/custom-order/contact are higher/looser than the auth endpoints
 * since legitimate shoppers retry a failed card, and custom-order's window
 * additionally guards the Vercel Blob photo-upload cost behind it. */
export const RATE_LIMITS = {
  /** Keyed on IP alone, across all three auth entry points. The per-endpoint
   * limits below are keyed `IP:email`, which means an account-enumeration
   * sweep gets a fresh bucket for every address it tries — this is the bucket
   * that survives that. Checked *before* the per-endpoint one, so it's the
   * first thing such a sweep hits.
   *
   * Note `getClientIp()` returns the constant "unknown" with no proxy in
   * front, so every request from a local dev server shares one bucket: 20
   * attempts in 10 minutes trips it for everyone. Wait out the window or drop
   * the `ratelimit:auth-ip:unknown` key in Upstash. */
  "auth-ip": { max: 20, window: "10 m" },
  /** The backstop inside `authorize()` itself, so it covers every way a
   * credentials check can be reached — not just the Server Actions.
   *
   * Needed because NextAuth's own `POST /api/auth/callback/{admin,customer}`
   * is public (proxy.ts matches only `/admin/*` and `/account/*`), so a
   * client that posts a CSRF token straight to it skips the login form and
   * every limit attached to it. Verified before the fix: 25 consecutive failed
   * admin logins through that endpoint, none refused.
   *
   * A separate scope from `auth-ip` on purpose. The form path calls that one
   * and this one, so sharing a scope would spend two tokens per attempt and
   * silently halve every limit. */
  "auth-endpoint": { max: 20, window: "10 m" },
  "admin-login": { max: 5, window: "10 m" },
  login: { max: 5, window: "10 m" },
  signup: { max: 5, window: "10 m" },
  checkout: { max: 10, window: "10 m" },
  "custom-order": { max: 6, window: "15 m" },
  contact: { max: 5, window: "10 m" },
} as const satisfies Record<string, { max: number; window: `${number} ${"s" | "m" | "h"}` }>;

export type RateLimitScope = keyof typeof RATE_LIMITS;

const limiters = new Map<RateLimitScope, Ratelimit>();

function getLimiter(scope: RateLimitScope): Ratelimit {
  let limiter = limiters.get(scope);
  if (!limiter) {
    const { max, window } = RATE_LIMITS[scope];
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, window),
      prefix: `ratelimit:${scope}`,
    });
    limiters.set(scope, limiter);
  }
  return limiter;
}

/** Atomically checks-and-increments a sliding-window limit backed by Upstash
 * Redis, so the limit actually holds across Vercel's serverless instances
 * and survives redeploys (unlike the old in-memory `Map`). Every call counts
 * toward the limit — success or failure — rather than only failures: Upstash's
 * `.limit()` doesn't cleanly support "only count failures," and a flat
 * per-request count is the only sensible model for the volumetric endpoints
 * (checkout/custom-order/contact) anyway. Returns true if the key should be
 * rejected without touching the DB/bcrypt/Xendit/Blob. */
export async function isRateLimited(scope: RateLimitScope, key: string): Promise<boolean> {
  const { success } = await getLimiter(scope).limit(key);
  return !success;
}

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
const RATE_LIMITS = {
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

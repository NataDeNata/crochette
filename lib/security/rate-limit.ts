import { headers } from "next/headers";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** Vercel sets x-forwarded-for on every request; falls back to a constant
 * so local dev (no proxy) still gets a stable, if shared, rate-limit key. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

type Bucket = { count: number; resetAt: number };

/** In-memory only — resets on redeploy/restart, not shared across serverless
 * instances. Good enough to blunt casual brute-forcing today; a proper
 * Redis-backed limiter (Upstash) is still open Phase 2 scope for every auth
 * endpoint, admin login included. */
const buckets = new Map<string, Bucket>();

function sweepExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Returns true if the given key (e.g. `${ip}:${email}`) is currently
 * rate-limited and should be rejected without touching the DB/bcrypt. */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  sweepExpired(now);

  const bucket = buckets.get(key);
  if (!bucket) return false;
  return bucket.resetAt > now && bucket.count >= MAX_ATTEMPTS;
}

/** Call after a failed attempt. */
export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.count += 1;
}

/** Call after a successful attempt to clear the counter for that key. */
export function clearAttempts(key: string): void {
  buckets.delete(key);
}

import { headers } from "next/headers";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * The client IP used as a rate-limit key — taken from a source the *platform*
 * controls, never from a position the client can inject.
 *
 * `x-real-ip` is set by Vercel's edge to the real connecting IP and overwrites
 * any value the client sent, so it is preferred. Its fallback is the **last**
 * entry of `x-forwarded-for`, not the first: Vercel appends the true connecting
 * IP to whatever XFF the client supplied, so the header reads
 * `<client-injected...>, <real ip>`. Reading `split(",")[0]` (the old code) took
 * the leftmost, client-controlled value — which let an attacker mint a fresh
 * rate-limit bucket per request by rotating the header, defeating every
 * IP-keyed limit here (auth, checkout, custom-order, contact). The rightmost
 * entry is the one the trusted hop added.
 *
 * Falls back to a constant so local dev (no proxy, neither header present) still
 * gets a stable, if shared, key rather than throwing.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();

  const realIp = h.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor.split(",");
    const last = parts[parts.length - 1]?.trim();
    if (last) return last;
  }

  return "unknown";
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
  /** The second-factor step, keyed on IP. Tighter than `admin-login` because
   * the search space is smaller: a 6-digit code is one in a million, and the
   * ±1 drift window (lib/security/totp.ts) makes three of them valid at any
   * moment. 10 tries per 10 minutes keeps an online guess hopeless without
   * punishing someone fat-fingering a code off a phone screen. */
  "admin-totp": { max: 10, window: "10 m" },
  login: { max: 5, window: "10 m" },
  signup: { max: 5, window: "10 m" },
  /** The two Stage B request paths, declared here with the rest rather than
   * invented at the call site.
   *
   * These are not guessing limits — neither form can be brute-forced, since
   * both answer identically whatever they are given. They are **outbound-mail**
   * limits: each accepted request sends a real email to an address the
   * requester names, so an unlimited form is a way to have this studio's
   * verified sending domain mail a stranger repeatedly. That is a deliverability
   * problem (a domain that sends unwanted mail loses its reputation) before it
   * is a cost one, which is why they are tighter than the volumetric endpoints
   * below despite being cheap to serve.
   *
   * Keyed `IP:email` like the auth endpoints, behind the same `auth-ip` bucket,
   * so rotating the address does not buy a fresh allowance. */
  "password-reset": { max: 5, window: "15 m" },
  /**
   * The same form, keyed on the **email alone** — no IP in the key.
   *
   * Every other limit here is keyed `IP:email`, which caps what one client can
   * do and is the right shape for guessing. It is the wrong shape for this: the
   * thing being spent is a mail to *someone else's* inbox, so an attacker with
   * a pool of addresses gets a fresh bucket per hop and can have this studio's
   * verified sending domain deliver to one victim as often as they like. A cap
   * on the address is the only one that binds.
   *
   * 3 an hour. A genuine shopper needs one, occasionally two when the first
   * lands in spam.
   *
   * **The trade is real and is accepted deliberately.** A per-address bucket
   * means an attacker can exhaust *someone else's* allowance and stop them
   * resetting for the rest of the hour. That is a nuisance, bounded and
   * self-clearing, and it is a much smaller harm than an unbounded mail relay
   * pointed at one inbox. It is not an account lockout: nothing is disabled,
   * sign-in is untouched, and the existing password keeps working throughout.
   */
  "password-reset-email": { max: 3, window: "1 h" },
  /** Tighter than the reset request: this one is reachable from a signed-in
   * page with a button on it, so a bored click-through costs nothing, and three
   * genuine resends inside a quarter of an hour already means the mail is not
   * arriving and another copy will not help. */
  "verify-email": { max: 3, window: "15 m" },
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

/**
 * The two-bucket check every credentials entry point makes: `auth-ip` first,
 * because it's the bucket an enumeration sweep can't escape by varying the
 * email, then the per-endpoint one keyed `IP:email`.
 *
 * Both are spent on each attempt by design — see the `auth-endpoint` note above
 * for why they are separate scopes.
 */
export async function isAuthRateLimited(
  scope: RateLimitScope,
  ip: string,
  emailKey: string
): Promise<boolean> {
  return (await isRateLimited("auth-ip", ip)) || (await isRateLimited(scope, `${ip}:${emailKey}`));
}

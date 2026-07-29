import type { ErrorEvent, Breadcrumb } from "@sentry/nextjs";

/**
 * Shared Sentry configuration and scrubbing helpers.
 *
 * Deliberately free of Node-only APIs and of any `@/lib/db` import, because
 * this module is loaded by `sentry.edge.config.ts` and `instrumentation-client.ts`
 * as well as the server config — it has to be safe in all three runtimes.
 * The server-only logger that consumes it lives in `./log.ts`.
 */

/** Single source of truth for "is Sentry on". Next inlines `NEXT_PUBLIC_*` at
 * build time, so with no DSN this constant-folds to `false` and the Sentry
 * branches dead-code-eliminate — the same lazy/inert contract `lib/db/index.ts`,
 * `lib/email/resend.ts`, and `lib/payments/xendit.ts` already follow. */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
export const SENTRY_ENABLED = Boolean(SENTRY_DSN);

/**
 * NODE_ENV is checked FIRST and deliberately wins. `.env.local` on this project
 * carries a stale `VERCEL_ENV="preview"` left behind by an earlier
 * `vercel env pull`, so trusting VERCEL_ENV alone would tag every local dev
 * error as "preview" and silently bypass the dev-send gate in `beforeSend`.
 * `next dev` always sets NODE_ENV=development, which VERCEL_ENV cannot forge.
 */
export const SENTRY_ENVIRONMENT =
  process.env.NODE_ENV === "development"
    ? "development"
    : (process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "production");

export const SENTRY_RELEASE =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA;

/**
 * Next signals control flow by *throwing*: `redirect()` and `notFound()` both
 * raise an error carrying a `digest`. These are successful navigations, not
 * failures — capturing them would flood Sentry with fake issues.
 *
 * This matters most in the login actions (`app/admin/login/actions.ts`,
 * `app/account/login/actions.ts`, `app/account/signup/actions.ts`), which
 * `throw error;` on the *success* path so `signIn()`'s redirect can propagate.
 *
 * Checks `digest` rather than importing `isRedirectError` from
 * `next/dist/client/components/redirect` — that's an unstable internal path
 * that has moved between Next majors.
 */
export function isNextControlFlowError(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null | undefined)?.digest;
  if (typeof digest === "string") {
    if (
      digest.startsWith("NEXT_REDIRECT") ||
      digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") || // Next 15+ notFound()/forbidden()/unauthorized()
      digest === "NEXT_NOT_FOUND" ||
      digest === "DYNAMIC_SERVER_USAGE" ||
      digest === "BAILOUT_TO_CLIENT_SIDE_RENDERING"
    ) {
      return true;
    }
  }
  const message = (err as { message?: unknown } | null | undefined)?.message;
  return message === "NEXT_NOT_FOUND";
}

/**
 * Keys are normalized to space-separated lowercase words before matching, so
 * `shippingCity`, `shipping_city`, and `x-callback-token` all reduce to the same
 * shape. Without this, `\b`-anchored alternatives silently never fire: there is
 * no word boundary inside `shippingCity`, so a naive `\bcity\b` matched nothing
 * in a codebase that names everything in camelCase.
 */
function normalizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .toLowerCase();
}

/**
 * Keys whose VALUES must never be logged or sent.
 *
 * Note what is deliberately NOT here: `session` (it would swallow the useful,
 * non-PII `xenditSessionId`; cookies are handled by SCRUB_HEADERS instead), and
 * a bare `name`, which would take `productName` with it — catalog data, not
 * personal data. Personal name keys are spelled out individually instead, and
 * an exact key of `name` is caught by PII_EXACT_KEYS below.
 */
const PII_KEY_PATTERN =
  /\b(e?mail|phone|mobile|msisdn|first ?name|last ?name|sur ?name|full ?name|customer ?name|contact ?name|recipient|address|line ?1|line ?2|street|barangay|city|province|postal|zip ?code|zip|password|passwd|secret|token|api ?key|authorization|cookie|credit ?card|card ?number|cvv|cvc|iban|account ?number)\b/;

/** Bare words that are PII standing alone but harmless as a suffix —
 * `name` is a person, `productName` is a product. */
const PII_EXACT_KEYS = new Set(["name", "card", "ip"]);

function isPiiKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return PII_EXACT_KEYS.has(normalized) || PII_KEY_PATTERN.test(normalized);
}

const REDACTED = "[redacted]";

/**
 * Value-level scrubs for free text we can't key-match. This is not paranoia:
 * `lib/email/resend.ts` throws `Resend send failed: <message>` where the
 * message routinely contains the recipient address, and Postgres unique-violation
 * errors embed the conflicting value verbatim. Those strings land in
 * `err.message` and would otherwise be sent as-is.
 */
const VALUE_SCRUBBERS: Array<[RegExp, string]> = [
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]"],
  [/\+?63[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{4}/g, "[phone]"], // PH mobile, international form
  [/\b09\d{9}\b/g, "[phone]"], // PH mobile, local form
  [/\b(?:\d[ -]*?){14,19}\b/g, "[card]"], // 14+ so 13-digit epoch-ms timestamps don't false-positive
  [/\bxnd_[A-Za-z0-9_]+/g, "[xendit-key]"],
  [/\bre_[A-Za-z0-9_]+/g, "[resend-key]"],
  [/postgres(?:ql)?:\/\/[^\s"']+/gi, "[db-url]"],
  // drizzle/postgres-js format failures as "Failed query: <sql>\nparams: a,b,c"
  // — the bound VALUES, verbatim. A failing `insert into orders` therefore puts
  // the customer's name and street address straight into err.message, where key
  // matching can't reach them because they're a flat comma-joined string. The
  // SQL text above it is what's actually diagnostic; the params are not worth
  // the exposure.
  [/\nparams:[\s\S]*$/, "\nparams: [redacted]"],
];

export function scrubString(input: string): string {
  let out = input;
  for (const [re, replacement] of VALUE_SCRUBBERS) out = out.replace(re, replacement);
  return out;
}

/** Depth-limited, cycle-safe deep scrub. Used by both the logger and `beforeSend`. */
export function scrubValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (depth > 6) return "[depth-limit]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return scrubString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if (seen.has(value as object)) return "[circular]";
    seen.add(value as object);
    if (Array.isArray(value)) return value.slice(0, 50).map((v) => scrubValue(v, depth + 1, seen));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isPiiKey(k) ? REDACTED : scrubValue(v, depth + 1, seen);
    }
    return out;
  }
  return String(value);
}

const SCRUB_HEADERS = new Set([
  "cookie",
  "set-cookie",
  "authorization",
  "x-callback-token", // Xendit's webhook shared secret — not on any SDK denylist
  "x-forwarded-for",
  "x-real-ip",
  "x-vercel-forwarded-for",
  "true-client-ip",
]);

/**
 * The single Sentry egress scrubber — applied on server, edge, and client.
 * `sendDefaultPii: false` already stops the SDK attaching bodies, cookies, and
 * client IPs; this is defence-in-depth for anything we attach ourselves, plus
 * the headers the SDK does send that aren't on its own denylist.
 */
export function beforeSend(event: ErrorEvent): ErrorEvent | null {
  if (event.request) {
    delete event.request.data; // Server Action args / form bodies — never send
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.headers) {
      for (const key of Object.keys(event.request.headers)) {
        if (SCRUB_HEADERS.has(key.toLowerCase())) event.request.headers[key] = REDACTED;
      }
    }
    if (event.request.url) event.request.url = scrubString(event.request.url);
  }

  // id only — never email, username, or ip_address.
  if (event.user) event.user = { id: event.user.id };

  if (event.message) event.message = scrubString(event.message);
  for (const value of event.exception?.values ?? []) {
    if (value.value) value.value = scrubString(value.value);
  }

  if (event.extra) event.extra = scrubValue(event.extra) as Record<string, unknown>;
  if (event.contexts) event.contexts = scrubValue(event.contexts) as typeof event.contexts;

  // Local dev shouldn't pollute the issue stream or burn quota unless asked.
  if (SENTRY_ENVIRONMENT === "development" && process.env.SENTRY_SEND_IN_DEV !== "1") return null;

  return event;
}

/**
 * Sentry's `consoleIntegration` is on by default and turns every `console.*`
 * call into a breadcrumb attached to subsequent events — which means our own
 * JSON log lines ride along for free, but ALSO that anything unscrubbed in a
 * log line would reach Sentry. Scrub breadcrumbs too.
 */
export function beforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.message) breadcrumb.message = scrubString(breadcrumb.message);
  if (breadcrumb.data) breadcrumb.data = scrubValue(breadcrumb.data) as Record<string, unknown>;
  return breadcrumb;
}

/** Noise floor — browser/extension/network artifacts plus Next's control-flow
 * throws as a message-level backstop to `isNextControlFlowError`. */
export const IGNORE_ERRORS: (string | RegExp)[] = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
  "Non-Error promise rejection captured",
  /^Load failed$/,
  /^Failed to fetch$/,
  /^NetworkError when attempting to fetch resource/,
  /^AbortError/,
  "NEXT_REDIRECT",
  "NEXT_NOT_FOUND",
];

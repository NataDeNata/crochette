import * as Sentry from "@sentry/nextjs";
import {
  SENTRY_ENABLED,
  SENTRY_ENVIRONMENT,
  isNextControlFlowError,
  scrubValue,
  scrubString,
} from "./sentry-shared";

/**
 * Structured application logging.
 *
 * Every call emits exactly ONE line of JSON to stdout, which Vercel's log
 * viewer parses so you can filter on `event`, `level`, or `errorId` with no
 * external service and no cost. When a Sentry DSN is configured, errors are
 * additionally captured as grouped, alertable issues.
 *
 * The two sinks are complementary, not duplicative: the JSON line answers
 * "what happened", Sentry answers "alert me, with a stack trace, deduped".
 * Note that Sentry's `consoleIntegration` also turns these lines into
 * breadcrumbs for free — which is exactly why nothing PII may go into one.
 *
 * **Server-only.** Imports the Sentry Node SDK and is meant for Server Actions,
 * route handlers, and `lib/**` server code — do not import it from a client
 * component (same convention as `lib/data/products.server.ts`). The seed CLI
 * scripts in `lib/db/` deliberately keep plain `console` output.
 *
 * ## What may go in a log `context`
 * **Allowed — identifiers, never identities:** `orderId`, `productId`,
 * `imageId`, `discountCodeId`, `customerId`, `slug`, counts, cent amounts,
 * enum statuses, booleans, durations, `xenditPaymentId` (a payment *reference*,
 * not card data — safe and useful for reconciliation).
 *
 * **Forbidden:** names, emails, phone numbers, any shipping address field, raw
 * form data or request bodies, `x-callback-token`, API keys, IP addresses.
 *
 * The scrubber in `./sentry-shared.ts` is a safety net for mistakes, not a
 * licence to log PII.
 */

export type LogContext = Record<string, string | number | boolean | null | undefined>;

type Level = "info" | "warn" | "error";

/** Warn-level events important enough to also reach Sentry as a message.
 * Everything else stays console-only (and still becomes a breadcrumb). */
const ALERTING_WARN_EVENTS = new Set<string>([
  "discount.over_redeemed",
  "webhook.xendit.unknown_event",
  "webhook.xendit.token_not_configured",
  "email.send_failed",
  "ratelimit.backend_unavailable",
]);

function newCorrelationId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: scrubString(err.message),
      stack: err.stack ? scrubString(err.stack) : undefined,
      digest: (err as { digest?: string }).digest,
      cause: err.cause ? scrubString(String(err.cause)) : undefined,
    };
  }
  if (typeof err === "string") return { name: "NonError", message: scrubString(err) };
  return { name: "NonError", message: JSON.stringify(scrubValue(err)) };
}

function emit(level: Level, event: string, context: LogContext | undefined, err?: unknown) {
  // A logger must never be the thing that breaks a request.
  try {
    const line = {
      level,
      event,
      ts: new Date().toISOString(),
      // Must be the SHARED constant, not a local `VERCEL_ENV ?? NODE_ENV`:
      // `.env.local` carries a stale VERCEL_ENV="preview", so resolving it here
      // tagged every local dev log line as "preview" — and disagreed with the
      // `environment` on the matching Sentry event, which is the one thing that
      // has to line up when correlating the two sinks.
      env: SENTRY_ENVIRONMENT,
      ...((scrubValue(context ?? {}) as Record<string, unknown>) ?? {}),
      ...(err !== undefined ? { err: serializeError(err) } : {}),
    };
    const json = JSON.stringify(line);
    if (level === "error") console.error(json);
    else if (level === "warn") console.warn(json);
    else console.log(json);
  } catch {
    console.error(`{"level":"error","event":"log.emit_failed","original":${JSON.stringify(event)}}`);
  }
}

export function logInfo(event: string, context?: LogContext): void {
  emit("info", event, context);
}

/** Returns a correlation id present in both sinks. */
export function logWarn(event: string, context?: LogContext): string {
  const errorId = newCorrelationId();
  emit("warn", event, { errorId, ...context });

  if (SENTRY_ENABLED && ALERTING_WARN_EVENTS.has(event)) {
    try {
      Sentry.withScope((scope) => {
        scope.setLevel("warning");
        scope.setTag("event", event);
        scope.setTag("errorId", errorId);
        if (context) scope.setContext("log", scrubValue(context) as Record<string, unknown>);
        scope.setFingerprint([event]);
        Sentry.captureMessage(event, "warning");
      });
    } catch {
      /* telemetry must never break the request */
    }
  }

  return errorId;
}

/**
 * Logs an error as JSON and, when a DSN is configured, to Sentry. Returns a
 * correlation id that appears in both sinks — safe to surface to a user as a
 * support reference, and it works identically with Sentry switched off.
 *
 * Silently ignores Next's control-flow throws, so wrapping a redirecting
 * action in try/catch can never mis-report a success as a failure.
 */
export function logError(event: string, err: unknown, context?: LogContext): string {
  if (isNextControlFlowError(err)) return "";

  const errorId = newCorrelationId();
  emit("error", event, { errorId, ...context }, err);

  if (SENTRY_ENABLED) {
    try {
      Sentry.withScope((scope) => {
        scope.setTag("event", event);
        scope.setTag("errorId", errorId);
        if (context) scope.setContext("log", scrubValue(context) as Record<string, unknown>);
        // Group by our stable event name as well as the stack: an
        // "email.send_failed" is one issue whether it throws from Resend's
        // client or from our own wrapper.
        scope.setFingerprint(["{{ default }}", event]);
        Sentry.captureException(err, { mechanism: { type: "logError", handled: true } });
      });
    } catch {
      /* telemetry must never break the request */
    }
  }

  return errorId;
}

/** Serverless functions can freeze before Sentry's transport drains. Route
 * handlers that capture late should await this before returning. */
export async function flushTelemetry(timeoutMs = 2000): Promise<void> {
  if (!SENTRY_ENABLED) return;
  try {
    await Sentry.flush(timeoutMs);
  } catch {
    /* ignore */
  }
}

import * as Sentry from "@sentry/nextjs";
import {
  SENTRY_DSN,
  SENTRY_ENVIRONMENT,
  SENTRY_RELEASE,
  beforeSend,
  beforeBreadcrumb,
  IGNORE_ERRORS,
} from "@/lib/observability/sentry-shared";

// Completely inert without a DSN: init is never called, so every
// captureException elsewhere is a no-op against an unbound client. Same
// lazy/no-op contract as lib/db/index.ts and lib/email/resend.ts.
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,

    // ---- ERRORS ONLY -----------------------------------------------------
    // 0 is falsy, so tracing is disabled and no transactions or spans are ever
    // sampled or sent. Written explicitly rather than omitted so the intent
    // survives future edits. This also keeps the OpenTelemetry machinery idle,
    // which is where the reported Next 16 + Turbopack RangeError lived.
    tracesSampleRate: 0,
    enableLogs: false, // Sentry's Logs product — we log to stdout instead
    // ----------------------------------------------------------------------

    sendDefaultPii: false,
    maxBreadcrumbs: 30,
    normalizeDepth: 4,
    ignoreErrors: IGNORE_ERRORS,
    beforeSend,
    beforeBreadcrumb,
  });
}

import * as Sentry from "@sentry/nextjs";
import {
  SENTRY_DSN,
  SENTRY_ENVIRONMENT,
  SENTRY_RELEASE,
  beforeSend,
  beforeBreadcrumb,
  IGNORE_ERRORS,
} from "@/lib/observability/sentry-shared";

// Next 16 / Sentry v10 replaced the old `sentry.client.config.ts` with this file.
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,

    // ---- ERRORS ONLY ----
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    enableLogs: false,
    // ---------------------

    sendDefaultPii: false,
    maxBreadcrumbs: 30,
    ignoreErrors: IGNORE_ERRORS,

    // Only report errors originating from our own bundle. Browser extensions
    // and injected scripts otherwise dominate the issue stream on a
    // consumer-facing storefront.
    allowUrls: [/crochette-zeta\.vercel\.app/, /localhost/],

    beforeSend,
    beforeBreadcrumb,
  });
}

// Deliberately NOT exporting `onRouterTransitionStart` — that hook exists only
// to start navigation spans, and tracing is off.

import * as Sentry from "@sentry/nextjs";
import {
  SENTRY_DSN,
  SENTRY_ENVIRONMENT,
  SENTRY_RELEASE,
  beforeSend,
  beforeBreadcrumb,
  IGNORE_ERRORS,
} from "@/lib/observability/sentry-shared";
import { SITE_HOST } from "@/lib/site";

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
    //
    // Derived from SITE_HOST rather than written out. This was a literal
    // `/crochette-zeta\.vercel\.app/`, which is the worst kind of duplicate:
    // it names the deployment host a second time, in a place nothing links
    // back to lib/site.ts, and it fails *silently*. Rename the project and
    // this allowlist matches nothing — no error, no warning, just an issue
    // stream that quietly goes empty and reads as "no bugs in production".
    //
    // Plain strings, not regexes: Sentry matches these as substrings against
    // the script URL, so a host needs no escaping and cannot be broken by a
    // dot in the domain being read as "any character".
    allowUrls: [SITE_HOST, "localhost"],

    beforeSend,
    beforeBreadcrumb,
  });
}

// Deliberately NOT exporting `onRouterTransitionStart` — that hook exists only
// to start navigation spans, and tracing is off.

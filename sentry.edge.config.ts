import * as Sentry from "@sentry/nextjs";
import {
  SENTRY_DSN,
  SENTRY_ENVIRONMENT,
  SENTRY_RELEASE,
  beforeSend,
  beforeBreadcrumb,
  IGNORE_ERRORS,
} from "@/lib/observability/sentry-shared";

// Nothing currently runs on the Edge runtime — `proxy.ts` was confirmed to
// build as a Node function (its import graph reaches postgres-js and bcryptjs,
// and the build emits an .nft trace rather than an edge entry in
// middleware-manifest.json). This file is cheap insurance so moving any route
// to Edge later doesn't silently open an observability hole.
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,
    tracesSampleRate: 0,
    enableLogs: false,
    sendDefaultPii: false,
    maxBreadcrumbs: 20,
    ignoreErrors: IGNORE_ERRORS,
    beforeSend,
    beforeBreadcrumb,
  });
}

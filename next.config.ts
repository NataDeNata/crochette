import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets the dev server's HMR/dev resources load when testing through an ngrok
  // tunnel (needed for local Xendit webhook testing, which requires HTTPS).
  // Dev-only — has no effect on production builds.
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

// Gated on the DSN so that with Sentry switched off the build is exactly what
// it was before: no plugin injection, no source-map generation, no build-time
// network calls.
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,

      // Source-map upload only when a build-time auth token exists, so local
      // and preview builds without it still succeed (stack traces are just
      // minified until then). `deleteSourcemapsAfterUpload` matters: it stops
      // .map files being served publicly, which would expose server source.
      sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
        deleteSourcemapsAfterUpload: true,
      },

      silent: !process.env.CI,
      telemetry: false,
      tunnelRoute: false, // adds a request hop; revisit only if ad-blockers eat client errors

      // Deliberately NOT set: automaticVercelMonitors, reactComponentAnnotation,
      // disableLogger. All three are deprecated in favour of `webpack.*` keys
      // that Turbopack — the Next 16 default builder — doesn't read, so they are
      // no-ops here that only emit deprecation warnings on every build. Each was
      // being set to its already-default "off" value anyway.
    })
  : nextConfig;

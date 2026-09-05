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
  experimental: {
    serverActions: {
      // Next's default Server Action body limit is 1 MB. Both upload paths
      // promise far more than that — lib/validation/photos.ts allows 4 photos
      // at 5 MB each, and the /custom form says so in as many words — so any
      // photo over ~1 MB (i.e. most phone photos) was rejected with a bare 413
      // *before* the action ran: no field error, no log line, and the whole
      // filled-in commission form lost. 22mb is 4 × 5 MB plus multipart
      // overhead. Raise MAX_PHOTO_BYTES and this together, or neither.
      bodySizeLimit: "22mb",
    },
  },
  // CSP (nonce-based, per-request) lives in proxy.ts instead — this file's
  // `headers` config cannot produce a per-request nonce value. These have no
  // such constraint.
  //
  // X-Frame-Options duplicates the CSP's `frame-ancestors 'none'`. It was added
  // because the CSP shipped Report-Only, which enforces nothing — `frame-ancestors`
  // reported a framing attempt and then permitted it, so this was the only real
  // clickjacking gate. The CSP now enforces and `frame-ancestors` supersedes this
  // wherever both are read, so it is kept as belt-and-braces rather than as the
  // load-bearing control: it costs one header, and it is what still answers if
  // the CSP is ever reverted to Report-Only.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
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

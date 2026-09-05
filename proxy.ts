import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login"]);
const PUBLIC_ACCOUNT_PATHS = new Set(["/account/login", "/account/signup"]);

// Same remote image hosts as next.config.ts's images.remotePatterns — img-src
// has to enumerate them or product photography (Blob-hosted) and the seed
// photography (Unsplash) both break under the CSP below.
const IMG_SRC_HOSTS = "https://images.unsplash.com https://*.public.blob.vercel-storage.com";

/**
 * Ships as `Content-Security-Policy-Report-Only` first (Stage: report-only).
 * Flip this one constant to `Content-Security-Policy` once a manual pass over
 * every route class (storefront, product, cart, checkout, commission form,
 * every admin page) shows zero reported violations — see
 * Cro_Security_Spec.md's Implementation Decisions.
 */
const CSP_HEADER_NAME = "Content-Security-Policy-Report-Only";

/**
 * `style-src` keeps `unsafe-inline` deliberately: inline styles come from the
 * styling layer, the animation library and component-level style props, and a
 * nonce cannot cover any of those. `script-src` takes the nonce with
 * `strict-dynamic`, which is what lets Next's own framework scripts run once
 * Next re-derives the nonce from this very header (see "How nonces work in
 * Next.js", node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
 * `'unsafe-eval'` is dev-only — React's dev-mode error-stack reconstruction
 * needs it; production uses neither React nor Next's own code paths that do.
 */
function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${IMG_SRC_HOSTS}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  if (pathname.startsWith("/admin") && !PUBLIC_ADMIN_PATHS.has(pathname) && role !== "admin") {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (pathname.startsWith("/account") && !PUBLIC_ACCOUNT_PATHS.has(pathname) && role !== "customer") {
    return NextResponse.redirect(new URL("/account/login", req.url));
  }

  // Generated fresh per request — a fixed nonce is not a nonce. Base64 of a
  // UUID rather than the UUID's own hyphenated text, matching Next's own
  // documented pattern for this exact mechanism.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeaderValue = buildCspHeader(nonce);

  // Requires the `{ request: { headers } }` form specifically: `{ headers }`
  // on its own would hand the nonce to the *client* response instead of the
  // render, which defeats the point of a value the page must read but an
  // attacker must not predict.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_HEADER_NAME, cspHeaderValue);
  return response;
});

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

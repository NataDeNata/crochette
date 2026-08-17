"use client";

import { useEffect } from "react";
import { Cormorant_Garamond, Work_Sans } from "next/font/google";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";
import { cn } from "@/lib/utils";

/**
 * Last-resort boundary: app/layout.tsx itself failed, so this REPLACES the root
 * layout and must render its own <html>/<body>. The layout's next/font
 * variables and stylesheet don't exist here, so they're re-declared below.
 *
 * COLOUR HERE IS RESTRICTED TO :root TOKENS, AND THAT IS NOT AN OVERSIGHT.
 * Because this replaces the root layout, components/layout/SiteChrome.tsx never
 * runs, so the `data-surface="storefront" data-world="cutout"` pair is never
 * stamped on this <html>. Every cream/cut-out token — --keyline, --sheet,
 * --press-red, --butter, --ground — is declared on that attribute pair in
 * globals.css and resolves to NOTHING here: the utility emits a var() that has
 * no value, and the text falls back to whatever it inherits. So this file uses
 * --destructive/--muted-foreground/--primary (all on plain :root) where its
 * siblings app/error.tsx and app/shop/[slug]/not-found.tsx use --press-red and
 * friends. Do not "consistency-fix" it to match them.
 *
 * Deliberately dependency-light — no FadeIn (framer-motion), no CartProvider,
 * and a plain <button> rather than components/ui/button.tsx (which pulls in
 * radix-ui and next/link). This runs when everything else has already broken;
 * it should rely on as little as possible.
 */

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});
const workSans = Work_Sans({
  variable: "--font-work",
  subsets: ["latin"],
  weight: ["300", "400"],
  display: "swap",
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.withScope((scope) => {
      scope.setTag("boundary", "app/global-error");
      scope.setLevel("fatal"); // the root layout itself failed
      if (error.digest) {
        scope.setTag("digest", error.digest);
        scope.setFingerprint(["server-digest", error.digest]);
      }
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <html lang="en" className={cn(cormorant.variable, workSans.variable, "font-sans")}>
      <body>
        <section className="py-[100px] page-gutter text-center">
          <div className="text-[13px] tracking-[3px] uppercase text-destructive mb-4">Crochette</div>
          <h1 className="font-serif font-medium text-[clamp(32px,4vw,46px)] mb-4">
            The site is having a moment
          </h1>
          <p className="text-[15.5px] text-muted-foreground max-w-[440px] mx-auto mb-8 leading-[1.6]">
            Something failed before the page could load. We&apos;ve been notified. Please try again in a
            moment.
          </p>
          {/* Classes mirror the shared Button's default/lg variant. */}
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-auto items-center justify-center gap-2 rounded-lg bg-primary px-[30px] py-3.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
          >
            Reload
          </button>
          {error.digest ? (
            <p className="mt-8 text-[12px] tracking-[1px] text-muted-foreground/70">
              Reference: {error.digest}
            </p>
          ) : null}
        </section>
      </body>
    </html>
  );
}

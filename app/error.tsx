"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";

/** Route-level error boundary. Renders inside app/layout.tsx, so it keeps the
 * site chrome, fonts, and cart context — see global-error.tsx for the
 * last-resort variant used when the layout itself fails. */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production a server-thrown error arrives here message-scrubbed, with
    // only a `digest`; instrumentation.ts's onRequestError already reported the
    // real one server-side. Fingerprinting on the digest groups the two rather
    // than opening a second, useless issue per incident.
    Sentry.withScope((scope) => {
      scope.setTag("boundary", "app/error");
      if (error.digest) {
        scope.setTag("digest", error.digest);
        scope.setFingerprint(["server-digest", error.digest]);
      }
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <section className="py-[100px] page-gutter text-center">
      <FadeIn>
        <div className="text-[13px] tracking-[3px] uppercase text-[oklch(0.5_0.05_20)] mb-4">
          Something went wrong
        </div>
        <h1 className="font-serif font-medium text-[clamp(32px,4vw,46px)] mb-4">A stitch came loose</h1>
        <p className="text-[15.5px] text-[oklch(0.42_0.02_60)] max-w-[440px] mx-auto mb-8 leading-[1.6]">
          We hit an unexpected problem loading this page. It&apos;s been logged on our side — try again, or
          head back to the collection.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button href="/shop" variant="outline">
            Back to shop
          </Button>
        </div>
        {error.digest ? (
          <p className="mt-8 text-[12px] tracking-[1px] text-[oklch(0.6_0.015_60)]">
            Reference: {error.digest}
          </p>
        ) : null}
      </FadeIn>
    </section>
  );
}

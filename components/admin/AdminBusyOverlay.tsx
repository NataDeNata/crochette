"use client";

import { Spinner } from "@/components/ui/Spinner";

/** A full-viewport, pointer-blocking veil for the moment between clicking an
 * admin save/delete button and the server actually confirming it.
 *
 * Admin forms already disable their own submit button while pending, but
 * that only stops a *second* click on the same button — it does nothing
 * about the sidebar, another row's "Delete", or a link out of the page
 * while a write is still in flight. This sits above everything else and
 * eats every click until the pending action resolves, which is what turns
 * "don't double-submit this one button" into "don't touch anything while
 * this is saving".
 *
 * Rendered conditionally by the caller (`{isPending && <AdminBusyOverlay />}`)
 * rather than always-mounted-but-hidden, so it never fights the animation
 * footgun this project has hit twice already (§9 of the docs) — there is no
 * exit transition to get wrong because there is nothing to exit. */
export function AdminBusyOverlay({ label = "Saving…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
    >
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-lg">
        <Spinner className="size-4" />
        {label}
      </div>
    </div>
  );
}

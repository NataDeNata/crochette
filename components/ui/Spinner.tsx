import { cn } from "@/lib/utils";

/** A small rotating ring for "this is in flight, wait for it" — a request
 * confirming, a background sync still catching up. `currentColor`-based so it
 * always matches whatever text it stands beside, inside a Button or out of
 * one.
 *
 * CSS `animate-spin` rather than a Framer loop: nothing here needs to enter or
 * exit on its own terms, the caller's own conditional render already handles
 * that, and a plain animation needs no JS to keep running through a stalled or
 * backgrounded frame loop — see the cart row fix this is landing alongside for
 * why that property specifically matters on this project.
 *
 * `motion-reduce:hidden` rather than a frozen ring: under reduced motion the
 * spinner is dropped entirely, matching how the rest of the storefront treats
 * the preference — the surrounding label or disabled state is left to say
 * "busy" on its own. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-2 border-current/30 border-t-current motion-reduce:hidden",
        className,
      )}
    />
  );
}

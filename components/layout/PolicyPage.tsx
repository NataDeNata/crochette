import type { ReactNode } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Sheet } from "@/components/layout/Sheet";

/* The four policy pages, on one sheet.
 *
 * The store took real payments with no shipping, returns, privacy or terms
 * information anywhere on it — no pages, no footer links, no delivery
 * estimate. For a store selling to consumers that is both a trust gap (a
 * shopper cannot find out how long a handmade piece takes, or what happens if
 * it arrives damaged) and very likely a compliance one.
 *
 * They share this shell rather than each rebuilding the masthead, so a change
 * to how a policy page reads lands on all four at once — and so nothing here
 * can drift into looking like a document pasted in from somewhere else.
 *
 * `lastReviewed` is printed on purpose. A policy with no date is a policy
 * nobody can tell is stale.
 */
export function PolicyPage({
  title,
  summary,
  lastReviewed,
  children,
}: {
  title: string;
  summary: string;
  lastReviewed: string;
  children: ReactNode;
}) {
  return (
    <Sheet innerClassName="py-10 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-[820px]">
        <FadeIn>
          <h1 className="type-sheet-display mt-8 max-w-[18ch] text-balance text-[clamp(32px,4.6vw,54px)] text-keyline">
            {title}
          </h1>
          <p className="mt-6 max-w-[58ch] text-[17px] leading-[1.7] text-muted-foreground">
            {summary}
          </p>
          <p className="type-sheet-spec mt-6 border-y-2 border-keyline py-4 text-keyline/60">
            Last reviewed {lastReviewed}
          </p>
        </FadeIn>

        <div className="mt-10 flex flex-col gap-9">{children}</div>
      </div>
    </Sheet>
  );
}

export function PolicySection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="type-sheet-display text-[22px] text-keyline">{heading}</h2>
      <div className="flex flex-col gap-3 text-[16px] leading-[1.7] text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

/**
 * A fact the studio owner has to confirm before launch, printed visibly rather
 * than hidden in a comment.
 *
 * These pages were drafted without the owner in the room, so every number in
 * them — dispatch windows, return periods, the business address — is a
 * plausible default and not a fact. A placeholder buried in a code comment is
 * a placeholder that ships; one the owner sees on the page every time they
 * look at it is one that gets answered. Delete the wrapper, keep the text, and
 * the page is finished.
 */
export function Confirm({ children }: { children: ReactNode }) {
  return (
    <mark className="bg-butter px-1.5 py-0.5 text-keyline" title="Confirm this before launch">
      {children}
    </mark>
  );
}

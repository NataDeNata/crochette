"use client";

import Image from "next/image";
import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";

/** The badge, drawn to fill the screen.
 *
 * `alt=""`. The masthead badge already announces "Yarns and Buttons" from its
 * own logo, and the copy this sits behind opens with the studio's name in text.
 * A third reading of the same three words, between the nav and the heading,
 * says nothing new.
 *
 * `priority` because this is the entire first screen of /about.
 *
 * **It is drawn larger than it exists.** The source crops to 624x624, and
 * `min(90vw,80svh)` asks for roughly 760px on a laptop — about 1.2x upscale,
 * and more on a large display. The rope ring is the finest detail in the
 * artwork and it does soften. That is a deliberate trade for the full-screen
 * treatment rather than an oversight: the badge is a backdrop that begins
 * dissolving on the first scroll, so it is never studied at rest for long. A
 * larger export of the logo removes the compromise entirely and nothing here
 * needs to change to take advantage of one. */
function Badge() {
  return (
    <Image
      src="/logo.jpg"
      alt=""
      width={624}
      height={930}
      priority
      className="h-[min(90vw,80svh)] w-[min(90vw,80svh)] rounded-full object-cover"
    />
  );
}

/**
 * /about opens on a full-screen badge that the page's own content then scrolls
 * up over, the badge fading out beneath it.
 *
 * The badge is `fixed`, not scrolled. That is what makes the content overlay it
 * rather than merely follow it: a scrolled badge leaves the screen at the same
 * rate the copy arrives, so the two never share it. Pinned to the viewport, the
 * heading rises across a badge that is still there, and the overlap is the
 * effect.
 *
 * The block below it is an empty `h-svh` spacer. It reserves the first screen
 * so the badge has one to itself before the copy climbs over it — a fixed
 * element is out of flow and displaces nothing, so without the spacer the
 * heading would start level with the badge instead of below it. The spacer is
 * pure layout and is measured by nothing; the fade reads the window's own
 * scroll offset. See the note at `useScroll` for why that distinction cost a
 * bug.
 *
 * Scale and opacity only, per the project's animation rule, and both on a
 * wrapper rather than the <img>: scaling the image node makes the browser
 * resample the decoded bitmap every frame it composites at a new size.
 *
 * **Stacking is load-bearing here.** The fixed layer is positioned and the
 * Sheets that scroll over it are not, and a positioned element paints above
 * static ones whatever their order in the document. Without the `relative z-10`
 * this component's caller puts on the content, the badge would cover the page
 * it is supposed to sit behind. `pointer-events-none` matters for the same
 * reason: at opacity 0 the layer is still there, and still over the whole
 * viewport.
 */
export function ScrollAwayLogo() {
  const reduceMotion = useReducedMotion();

  // Every hook runs above the reduced-motion branch, never below it. Framer's
  // useScroll/useTransform are ordinary hooks, and useReducedMotion subscribes
  // to the OS setting — so the render where that preference flips is a real
  // render, and an early return above these would reorder them on it.
  //
  // **The scroll offset is tracked by hand, and that is not preference.**
  //
  // Both of Framer's `useScroll` forms were tried here and both shipped the
  // same bug. A page can mount already scrolled: browsers restore scroll
  // position on reload (history.scrollRestoration defaults to "auto") and again
  // on back navigation, so it is an ordinary arrival rather than an edge case.
  // In that situation `useScroll` reported 0 and held there until the reader
  // next scrolled — which for a fixed, full-viewport layer meant the badge
  // painted at full opacity straight across the footer and the closing call to
  // action. Reproduced by scrolling to the foot of /about and pressing reload.
  //
  // `useScroll({ target })` failed because its progress needs the target
  // measured against the viewport and that had not happened yet; plain
  // `useScroll()` failed too, so it was not the measurement alone. The restore
  // lands after hydration and its scroll event does not reach a listener
  // Framer has already seeded at 0. Dispatching a synthetic scroll event did
  // not help either.
  //
  // Owning the value makes the seeding explicit: read the real offset on mount,
  // then again on the next two frames, because the restore can land after the
  // effect does. Everything after that is the ordinary scroll listener.
  const scrollY = useMotionValue(0);

  useEffect(() => {
    const update = () => scrollY.set(window.scrollY);
    update();
    const outer = requestAnimationFrame(() => {
      update();
      requestAnimationFrame(update);
    });
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(outer);
      window.removeEventListener("scroll", update);
    };
  }, [scrollY]);

  // One viewport of travel, computed per evaluation rather than captured, so a
  // resize or a phone's collapsing address bar cannot leave this reading
  // against a height the window no longer has.
  const progress = (y: number) => {
    if (typeof window === "undefined") return 0;
    return Math.min(1, Math.max(0, y / (window.innerHeight || 1)));
  };

  // A recession, not a shrink. The badge is behind the copy now rather than
  // making way for it, so it pulls back slightly instead of collapsing.
  const scale = useTransform(scrollY, (y) => 1 - 0.1 * progress(y));
  // Clear by 0.85 of that screen rather than all of it. Running the fade to the
  // very end leaves the badge still dissolving under the second section.
  const opacity = useTransform(scrollY, (y) => 1 - Math.min(1, progress(y) / 0.85));

  // Reduced motion gets one full screen of badge that simply scrolls away, in
  // normal flow, overlapping nothing. This is the case the rule exists for:
  // scroll-linked opacity ties whether something is visible to movement, and a
  // reader who asked for less of it should not have to scroll a logo out of
  // their own way — nor read a heading through one.
  if (reduceMotion) {
    return (
      <div className="flex h-svh items-center justify-center page-gutter">
        <Badge />
      </div>
    );
  }

  return (
    // A plain spacer now: it reserves the first screen so the badge has one to
    // itself before the copy arrives. It is no longer measured by anything.
    <div className="h-svh" aria-hidden>
      <motion.div
        style={{ scale, opacity }}
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center page-gutter"
      >
        <Badge />
      </motion.div>
    </div>
  );
}

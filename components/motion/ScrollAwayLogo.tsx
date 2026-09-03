"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/** The badge itself, at the one size it is drawn for.
 *
 * `alt=""`. The badge is the only thing on this screen, so the instinct is to
 * describe it — but the masthead already announces "Yarns and Buttons" from its
 * own logo, and the copy this scrolls into opens with the studio's name in
 * text. A third announcement of the same three words, with nothing else to
 * distinguish it, is noise between the nav and the heading.
 *
 * `priority` because this is the whole of the first screen on /about. Left to
 * lazy-load it would arrive after the fold it occupies.
 *
 * Capped at 300px: the source crops to 624x624, so 300 is the largest it can be
 * drawn without a 2x screen asking for more pixels than exist and softening the
 * rope ring, which is the finest detail in the artwork. */
function Badge() {
  return (
    <Image
      src="/logo.jpg"
      alt=""
      width={624}
      height={930}
      priority
      className="h-[min(58vw,300px)] w-[min(58vw,300px)] rounded-full object-cover"
    />
  );
}

/**
 * The About page opens on the studio badge, which shrinks and fades as the
 * visitor scrolls into the copy beneath it.
 *
 * Scroll-linked rather than time-based. The animation's entire job is to hand
 * the page over to its content, so it has to be driven by how far the reader
 * has actually travelled rather than by a clock that started at page load — a
 * timed version plays to someone who has not scrolled at all, and has already
 * finished for someone who lands mid-page on a back navigation.
 *
 * `["start start", "end start"]` maps this block's own travel — from its top
 * meeting the viewport top, to its bottom meeting it — onto 0 to 1, so the
 * badge is gone exactly when the block has finished passing.
 *
 * Scale and opacity only, per the project's animation rule. Both are
 * compositor-driven, so this neither lays out nor repaints on a scroll frame.
 */
export function ScrollAwayLogo() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // Every hook runs before the reduced-motion branch below, never after it.
  // Framer's useScroll/useTransform are ordinary hooks, so returning early
  // above them would change the hook order on the render where the preference
  // flips — which is a real render here, not a hypothetical: the OS setting can
  // change while the page is open and useReducedMotion subscribes to it.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.62]);
  // Fully transparent at 0.8 rather than 1, so the badge finishes clearing
  // slightly before the block does. Running it to the end leaves a ghost still
  // dissolving over the first line of the heading it is supposed to be making
  // way for.
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Reduced motion gets the badge at full size, and it simply scrolls off the
  // way any other element would. This rule exists precisely for effects like
  // this one: scroll-linked opacity makes whether something is visible depend
  // on movement, and a reader who has asked for less of it should not have to
  // scroll a logo out of their own way.
  if (reduceMotion) {
    return (
      <div className="flex min-h-[52svh] items-center justify-center page-gutter">
        <Badge />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="flex min-h-[62svh] items-center justify-center page-gutter"
    >
      {/* The transform lives on a wrapper rather than on the Image, so the
          scaling element and the element next/image sizes are not the same
          node. Scaling the img directly makes the browser resample the
          downloaded bitmap on every frame it is composited at a new size. */}
      <motion.div style={{ scale, opacity }}>
        <Badge />
      </motion.div>
    </div>
  );
}

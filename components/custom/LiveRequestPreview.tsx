"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PreviewData = {
  pieceType: string;
  preferredSize: string;
  preferredColors: string;
  description: string;
  photoPreviewUrls: string[];
};

export const EMPTY_PREVIEW: PreviewData = {
  pieceType: "",
  preferredSize: "",
  preferredColors: "",
  description: "",
  photoPreviewUrls: [],
};

const ease = [0.22, 1, 0.36, 1] as const;

/** Fades a value in/out only when it toggles between empty and non-empty —
 * typing within an already-filled field just re-renders instantly. */
function AnimatedSwap({
  swapKey,
  reduceMotion,
  children,
}: {
  swapKey: string;
  reduceMotion: boolean | null;
  children: ReactNode;
}) {
  if (reduceMotion) return <>{children}</>;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={swapKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.25, ease }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/* THE FIGURE THAT ISN'T PRINTED YET.
 *
 * This is the mechanism the whole storefront is positioned on, so it gets the
 * world's strongest move rather than a summary card. A commission is, exactly,
 * a piece that is not on any sheet — so the preview is an empty die-cut: the
 * cut line and fold tab are printed, and the window inside them is blank
 * until the customer's own words fill it.
 *
 * Every layer is the same construction the catalogue uses (`.diecut-arch`,
 * the dashed cut line, the trim margin, the butter tab), which is what makes
 * the promise legible without a caption: what you are describing will end up
 * looking like the things you were just browsing.
 *
 * The customer's reference photo, when they attach one, becomes the figure's
 * image — the one place on the site where a photograph in a die-cut window is
 * theirs rather than the studio's.
 */
export function LiveRequestPreview({
  pieceType,
  preferredSize,
  preferredColors,
  description,
  photoPreviewUrls,
}: PreviewData) {
  const reduceMotion = useReducedMotion();
  const snippet =
    description.length > 150 ? `${description.slice(0, 150)}…` : description;

  // Colours arrive as a free-text list from the picker. Splitting them back
  // out lets each one print as its own chip, which is how a spec sheet would
  // list them — and it degrades correctly to a single chip if someone types
  // prose instead of picking.
  const colors = preferredColors
    .split(/[,/]| and /i)
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 6);

  const hero = photoPreviewUrls[0];

  const figure = (
    <div className="mx-auto w-full max-w-[330px]">
      {/* The tab. Blank stock until there is something to letter on it. */}
      <div
        className={cn(
          "relative z-[1] mx-auto w-fit max-w-full border-2 border-keyline border-b-0 px-4 pb-2 pt-1.5 text-center transition-colors duration-300",
          pieceType ? "bg-butter" : "bg-secondary",
        )}
      >
        <AnimatedSwap swapKey={pieceType ? "named" : "blank"} reduceMotion={reduceMotion}>
          <p
            className={cn(
              "type-sheet-display truncate text-[19px]",
              pieceType ? "text-keyline" : "text-keyline/35",
            )}
          >
            {pieceType || "Not named yet"}
          </p>
        </AnimatedSwap>
        <AnimatedSwap
          swapKey={preferredSize ? "sized" : "unsized"}
          reduceMotion={reduceMotion}
        >
          <p
            className={cn(
              "type-sheet-spec text-[10px]",
              preferredSize ? "text-keyline/75" : "text-keyline/30",
            )}
          >
            {preferredSize || "Size to be decided"}
          </p>
        </AnimatedSwap>
        <span className="pointer-events-none absolute inset-x-2 bottom-0 border-b border-dashed border-keyline/50" />
      </div>

      {/* Cut line → trim margin → the window that is still blank. */}
      <div className="diecut-arch border-2 border-dashed border-keyline p-1.5">
        <div className="diecut-arch border-2 border-keyline bg-sheet p-1.5">
          <div className="diecut-arch relative flex aspect-4/5 flex-col items-center justify-center overflow-hidden bg-secondary px-6 text-center">
            {hero ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <span className="type-sheet-spec absolute bottom-4 border-2 border-keyline bg-sheet px-2 py-1 text-keyline">
                  Your reference
                </span>
              </>
            ) : (
              <AnimatedSwap
                swapKey={snippet ? "described" : "blank"}
                reduceMotion={reduceMotion}
              >
                {snippet ? (
                  <p className="text-[14px] leading-[1.6] text-keyline">
                    &ldquo;{snippet}&rdquo;
                  </p>
                ) : (
                  <p className="type-sheet-spec max-w-[20ch] text-keyline/35">
                    This one hasn&apos;t been printed yet
                  </p>
                )}
              </AnimatedSwap>
            )}
          </div>
        </div>
      </div>

      {/* Colours print below the figure as chips, the way a spec sheet lists
          the inks a plate will be run in. */}
      <div className="mt-5 min-h-[46px]">
        <p className="type-sheet-spec text-keyline/50">Colours</p>
        <AnimatedSwap
          swapKey={colors.length ? "colors" : "nocolors"}
          reduceMotion={reduceMotion}
        >
          {colors.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {colors.map((c) => (
                <span
                  key={c}
                  className="type-sheet-spec border-2 border-keyline bg-sheet px-2 py-1 text-[10px] text-keyline"
                >
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">
              Not chosen yet
            </p>
          )}
        </AnimatedSwap>
      </div>

      {/* Any further references ride as small cut chips under the figure. */}
      {photoPreviewUrls.length > 1 && (
        <div className="mt-4 flex gap-2">
          {photoPreviewUrls.slice(1).map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt=""
              className="h-11 w-11 border-2 border-keyline object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );

  if (reduceMotion) return figure;

  return (
    <motion.div layout transition={{ duration: 0.3, ease }}>
      {figure}
    </motion.div>
  );
}

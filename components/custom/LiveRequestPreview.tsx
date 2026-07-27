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

const shellClassName =
  "aspect-square rounded-[32px] p-9 bg-card border-2 border-dashed border-[oklch(0.75_0.03_20)] flex flex-col justify-center gap-[22px] overflow-hidden";

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

function MetaRow({ label, value, reduceMotion }: { label: string; value: string; reduceMotion: boolean | null }) {
  return (
    <div>
      <div className="text-[11px] tracking-[1.5px] uppercase text-[oklch(0.5_0.05_20)] mb-1">
        {label}
      </div>
      <AnimatedSwap swapKey={value ? "value" : "empty"} reduceMotion={reduceMotion}>
        <div className={cn("text-sm", value ? "text-foreground" : "text-[oklch(0.6_0.02_60)]")}>{value || "—"}</div>
      </AnimatedSwap>
    </div>
  );
}

/** "Stitched postcard" panel that mirrors the custom-order form back at the
 * customer as they fill it in — replaces the old static placeholder image. */
export function LiveRequestPreview({
  pieceType,
  preferredSize,
  preferredColors,
  description,
  photoPreviewUrls,
}: PreviewData) {
  const reduceMotion = useReducedMotion();
  const hasAnything = Boolean(
    pieceType || preferredSize || preferredColors || description || photoPreviewUrls.length
  );
  const snippet = description.length > 140 ? `${description.slice(0, 140)}…` : description;

  if (!hasAnything) {
    return (
      <div className={cn(shellClassName, "items-center text-center")}>
        <div className="font-serif text-[26px] text-[oklch(0.55_0.09_20)] mb-2.5">✂</div>
        <div className="text-[13.5px] text-[oklch(0.45_0.02_60)] leading-[1.6] max-w-[220px]">
          Your request will appear here as you type
        </div>
      </div>
    );
  }

  const content = (
    <>
      <div className="text-[11px] tracking-[2px] uppercase text-[oklch(0.5_0.05_20)]">
        Your request
      </div>
      <AnimatedSwap swapKey={pieceType ? "value" : "empty"} reduceMotion={reduceMotion}>
        <div className="font-serif font-medium text-2xl">
          {pieceType || "Your custom piece"}
        </div>
      </AnimatedSwap>
      <div className="flex gap-7">
        <MetaRow label="Size" value={preferredSize} reduceMotion={reduceMotion} />
        <MetaRow label="Colors" value={preferredColors} reduceMotion={reduceMotion} />
      </div>
      <AnimatedSwap swapKey={description ? "value" : "empty"} reduceMotion={reduceMotion}>
        <div
          className={cn(
            "text-[13.5px] leading-[1.6]",
            description ? "text-[oklch(0.42_0.02_60)]" : "text-[oklch(0.6_0.02_60)]",
          )}
        >
          {snippet || "Describe your dream piece to see it summarized here."}
        </div>
      </AnimatedSwap>
      {photoPreviewUrls.length > 0 && (
        <AnimatedSwap swapKey="photos" reduceMotion={reduceMotion}>
          <div className="flex gap-2">
            {photoPreviewUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                className="w-10 h-10 rounded-[8px] object-cover border-[1.5px] border-[oklch(0.75_0.03_20)]"
              />
            ))}
          </div>
        </AnimatedSwap>
      )}
    </>
  );

  if (reduceMotion) {
    return <div className={shellClassName}>{content}</div>;
  }

  return (
    <motion.div className={shellClassName} layout transition={{ duration: 0.3, ease }}>
      {content}
    </motion.div>
  );
}

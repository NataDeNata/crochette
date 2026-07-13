"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

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

const shellStyle = {
  aspectRatio: "1/1",
  borderRadius: 32,
  padding: 36,
  background: "oklch(0.98 0.01 85)",
  border: "2px dashed oklch(0.75 0.03 20)",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "center",
  gap: 22,
  overflow: "hidden",
};

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
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: "oklch(0.5 0.05 20)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <AnimatedSwap swapKey={value ? "value" : "empty"} reduceMotion={reduceMotion}>
        <div style={{ fontSize: 14, color: value ? "oklch(0.28 0.02 60)" : "oklch(0.6 0.02 60)" }}>{value || "—"}</div>
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
      <div style={{ ...shellStyle, alignItems: "center", textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--font-cormorant), serif",
            fontSize: 26,
            color: "oklch(0.55 0.09 20)",
            marginBottom: 10,
          }}
        >
          ✂
        </div>
        <div style={{ fontSize: 13.5, color: "oklch(0.45 0.02 60)", lineHeight: 1.6, maxWidth: 220 }}>
          Your request will appear here as you type
        </div>
      </div>
    );
  }

  const content = (
    <>
      <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "oklch(0.5 0.05 20)" }}>
        Your request
      </div>
      <AnimatedSwap swapKey={pieceType ? "value" : "empty"} reduceMotion={reduceMotion}>
        <div style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 24 }}>
          {pieceType || "Your custom piece"}
        </div>
      </AnimatedSwap>
      <div style={{ display: "flex", gap: 28 }}>
        <MetaRow label="Size" value={preferredSize} reduceMotion={reduceMotion} />
        <MetaRow label="Colors" value={preferredColors} reduceMotion={reduceMotion} />
      </div>
      <AnimatedSwap swapKey={description ? "value" : "empty"} reduceMotion={reduceMotion}>
        <div
          style={{
            fontSize: 13.5,
            lineHeight: 1.6,
            color: description ? "oklch(0.42 0.02 60)" : "oklch(0.6 0.02 60)",
          }}
        >
          {snippet || "Describe your dream piece to see it summarized here."}
        </div>
      </AnimatedSwap>
      {photoPreviewUrls.length > 0 && (
        <AnimatedSwap swapKey="photos" reduceMotion={reduceMotion}>
          <div style={{ display: "flex", gap: 8 }}>
            {photoPreviewUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  objectFit: "cover",
                  border: "1.5px solid oklch(0.75 0.03 20)",
                }}
              />
            ))}
          </div>
        </AnimatedSwap>
      )}
    </>
  );

  if (reduceMotion) {
    return <div style={shellStyle}>{content}</div>;
  }

  return (
    <motion.div style={shellStyle} layout transition={{ duration: 0.3, ease }}>
      {content}
    </motion.div>
  );
}

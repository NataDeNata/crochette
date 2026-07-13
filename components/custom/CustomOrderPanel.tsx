"use client";

import { useState } from "react";
import { CustomOrderForm } from "@/components/custom/CustomOrderForm";
import { LiveRequestPreview, EMPTY_PREVIEW, type PreviewData } from "@/components/custom/LiveRequestPreview";

/** Pairs the custom-order form with a live preview of what's being submitted.
 * Renders as two direct children (via fragment) so the parent's CSS grid
 * placement still applies to them. */
export function CustomOrderPanel() {
  const [preview, setPreview] = useState<PreviewData>(EMPTY_PREVIEW);

  return (
    <>
      <div>
        <h2
          style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 28, margin: "0 0 22px" }}
        >
          Start your request
        </h2>
        <CustomOrderForm onPreviewChange={setPreview} />
      </div>
      <LiveRequestPreview {...preview} />
    </>
  );
}

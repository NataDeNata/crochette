import { ImageResponse } from "next/og";

/* The link preview, drawn rather than photographed.
 *
 * The site had `twitter:card = summary_large_image` and no image anywhere to
 * put in it, so every link shared to Messenger, Instagram or Facebook — which
 * is how this studio's traffic actually arrives — unfurled as a bare title on
 * a grey box. A generated card rather than a photograph on purpose: the
 * catalogue's photography is the thing the review found problems in, and a
 * card built from the sheet's own furniture is true on any day regardless of
 * which pieces are in stock.
 *
 * Flexbox only, and no CSS custom properties: Satori supports neither `grid`
 * nor `var()`, so the palette is inlined here as literals. They are the same
 * values as the `[data-world="cutout"]` block in globals.css — if that block
 * is repainted again, this file is a second place to change.
 */

export const alt = "Yarns and Buttons — handmade crochet decor, stitched by hand in small batches";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GROUND = "#efe6d4";
const SHEET = "#fbf8f1";
const KEYLINE = "#2b2620";
const BUTTER = "#e9d3a9";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: GROUND,
          padding: 48,
        }}
      >
        {/* The sheet, with its cut line printed inside the trim. */}
        <div
          style={{
            flex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: SHEET,
            border: `4px solid ${KEYLINE}`,
            padding: 56,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                background: BUTTER,
                border: `4px solid ${KEYLINE}`,
                padding: "10px 20px",
                fontSize: 30,
                letterSpacing: 4,
                color: KEYLINE,
              }}
            >
              CROCHETTE
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 92,
                lineHeight: 1.05,
                color: KEYLINE,
                maxWidth: 820,
              }}
            >
              Made by hand. Made to keep.
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 28,
                fontSize: 32,
                color: KEYLINE,
                opacity: 0.7,
                maxWidth: 760,
              }}
            >
              Amigurumi, flowers and cozy decor, stitched in small batches.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              borderTop: `4px solid ${KEYLINE}`,
              paddingTop: 24,
              fontSize: 24,
              letterSpacing: 3,
              color: KEYLINE,
              opacity: 0.75,
            }}
          >
            <div style={{ display: "flex" }}>HANDMADE IN THE PHILIPPINES</div>
            <div style={{ display: "flex" }}>CUSTOM ORDERS WELCOME</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { GallerySection } from "@/components/gallery/GallerySection";
import { getFullGallery } from "@/lib/data/gallery";
import { OG_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Works in progress, finished pieces, and the little moments in between.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    title: "Gallery | Yarns and Buttons",
    description: "Works in progress, finished pieces, and the little moments in between.",
    images: [OG_IMAGE],
  },
};

export default async function GalleryPage() {
  const gallery = await getFullGallery();

  return (
    <>
      {/* The centrefold: the one spread in this world that is never die-cut.
          Every other surface frames a photograph inside a cut line and trimmed
          corners because that construction means "this comes off the page and
          you can own it". The gallery
          exists to show work rather than to sell a specific piece, so cutting
          it would make a promise the page cannot keep. Plates run to the
          gutter instead. */}
      <section className="bg-sheet">
        <div className="py-8 sm:py-10 lg:py-12">
          <div className="page-gutter">
            <div className="max-w-[1320px] mx-auto">
              <FadeIn>
                <h1 className="type-sheet-display text-[clamp(34px,5.4vw,66px)] text-keyline text-balance max-w-[16ch]">
                  A peek into the studio
                </h1>
                <p className="text-[17px] text-muted-foreground max-w-[52ch] leading-[1.7] mt-5">
                  Works in progress, finished pieces, and the little moments in between.
                </p>
              </FadeIn>
            </div>
          </div>

          <div className="page-gutter mt-12">
            <div className="max-w-[1320px] mx-auto">
              {gallery.length === 0 ? (
                // A blank plate rather than an apology in grey text — the
                // spread is still there, visibly waiting for work.
                <div className="flex min-h-[280px] items-center justify-center border-2 border-dashed border-keyline/40 p-8">
                  <p className="type-sheet-spec text-center text-keyline/50">
                    Photos coming soon
                  </p>
                </div>
              ) : (
                <GallerySection items={gallery} rowHeight={180} />
              )}
            </div>
          </div>
        </div>
      </section>

      <FadeIn>
        <section className="bg-sheet">
          <div className="page-gutter pb-14 pt-4 sm:pb-16 sm:pt-6">
            <div className="max-w-[1320px] mx-auto mb-14 border-t border-keyline/15" />
            <div className="max-w-[1320px] mx-auto grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h2 className="type-sheet-display text-[clamp(26px,3.6vw,44px)] text-keyline text-balance max-w-[16ch]">
                  Follow along on Instagram
                </h2>
                <p className="text-[16px] leading-[1.7] text-muted-foreground mt-4 max-w-[52ch]">
                  New pieces, works in progress and behind-the-scenes.
                </p>
              </div>
              <Button href="https://instagram.com">@crochette.studio</Button>
            </div>
          </div>
        </section>
      </FadeIn>
    </>
  );
}

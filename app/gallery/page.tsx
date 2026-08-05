import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/FadeIn";
import { GallerySection } from "@/components/gallery/GallerySection";
import { getFullGallery } from "@/lib/data/gallery";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Works in progress, finished pieces, and the little moments in between.",
  openGraph: {
    title: "Gallery — Crochette",
    description: "Works in progress, finished pieces, and the little moments in between.",
  },
};

export default async function GalleryPage() {
  const gallery = await getFullGallery();

  return (
    <>
      <section className="pt-12 sm:pt-[72px] page-gutter pb-12">
        <FadeIn>
          <div className="max-w-[1320px] mx-auto">
            <h1 className="type-akari-display text-[clamp(32px,5vw,58px)] text-ink text-balance mb-5">
              A peek into the studio
            </h1>
            <p className="text-[17px] text-muted-foreground max-w-[520px] leading-[1.7]">
              Works in progress, finished pieces, and the little moments in between.
            </p>
          </div>
        </FadeIn>
      </section>

      <section className="page-gutter pb-[100px]">
        <div className="max-w-[1320px] mx-auto">
          {gallery.length === 0 ? (
            // A blank sheet rather than an apology in grey text — the panel is
            // still there, visibly waiting for work.
            <div className="bg-paper rounded-lg border border-border min-h-[280px] flex items-center justify-center p-8">
              <p className="type-akari-label text-muted-foreground text-center">
                Photos coming soon
              </p>
            </div>
          ) : (
            <GallerySection items={gallery} rowHeight={180} />
          )}
        </div>
      </section>

      <FadeIn>
        <section className="page-gutter mb-[100px]">
          <div className="max-w-[1320px] mx-auto bg-paper rounded-lg border border-border p-8 sm:p-14">
            <h2 className="type-akari-display text-[clamp(24px,3.2vw,38px)] text-ink text-balance mb-4 max-w-[520px]">
              Follow along on Instagram
            </h2>
            <p className="text-[16px] leading-[1.7] text-muted-foreground mb-8 max-w-[460px]">
              New pieces, works in progress and behind-the-scenes.
            </p>
            <Button href="https://instagram.com">@crochette.studio</Button>
          </div>
        </section>
      </FadeIn>
    </>
  );
}

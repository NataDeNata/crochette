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
      <section className="pt-[72px] px-12 pb-12 text-center">
        <FadeIn>
          <div className="text-[13px] tracking-[3px] uppercase text-[oklch(0.5_0.05_20)] mb-4">
            Gallery
          </div>
          <h1 className="font-serif font-medium text-[clamp(38px,5vw,58px)] mb-4">
            A peek into the studio
          </h1>
          <p className="text-base text-[oklch(0.42_0.02_60)] max-w-[460px] mx-auto leading-[1.6]">
            Works in progress, finished pieces, and the little moments in between.
          </p>
        </FadeIn>
      </section>

      <section className="pt-5 px-12 pb-[100px]">
        {gallery.length === 0 ? (
          <p className="text-center text-sm text-[oklch(0.55_0.02_60)]">Photos coming soon.</p>
        ) : (
          <GallerySection items={gallery} rowHeight={180} />
        )}
      </section>

      <FadeIn>
        <section className="mx-8 mb-[100px] py-14 px-12 rounded-[36px] bg-[oklch(0.91_0.04_150)] text-center">
          <h2 className="font-serif font-medium text-3xl mb-3.5">
            Follow along on Instagram
          </h2>
          <p className="text-[15px] text-[oklch(0.3_0.03_150)] mb-6">
            New pieces, works in progress, and behind-the-scenes.
          </p>
          <Button href="https://instagram.com">@crochette.studio</Button>
        </section>
      </FadeIn>
    </>
  );
}

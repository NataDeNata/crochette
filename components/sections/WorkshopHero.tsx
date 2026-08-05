import Image from "next/image";
import Link from "next/link";
import { PaperBand } from "@/components/sections/PaperBand";

/* The first viewport: a full-bleed workshop photograph held between two bowed
 * paper bands, with the headline set light over the dark side of the frame.
 *
 * The composition follows the chosen world's quality bar: paper closes the
 * frame top and bottom, the photograph is warm and lit from inside the scene
 * rather than evenly, and the single action is a paper-filled rectangle with a
 * vermilion arrow. No scrim gradient across the whole image — the photograph is
 * already dark on the left, and dimming the rest to make text safe would flatten
 * the one thing this world is about.
 *
 * A Server Component. There is no entrance animation here at all: the world's
 * motion is a slow unfolding, and the page already arrives unfolded. FadeIn
 * handles the sections below.
 */
export function WorkshopHero({
  imageSrc,
  imageAlt,
  pieceCount,
}: {
  imageSrc: string;
  imageAlt: string;
  pieceCount: number;
}) {
  return (
    <section className="relative bg-ink">
      <div className="relative min-h-[560px] sm:min-h-[640px] lg:min-h-[calc(100svh-var(--nav-h))]">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />

        {/* Left-weighted only. The right two-thirds of the frame stay
            untouched so the piece itself is never veiled. */}
        <div className="absolute inset-0 bg-linear-to-r from-[oklch(0.16_0.01_60/0.92)] via-[oklch(0.16_0.01_60/0.55)] to-transparent" />

        {/* The sheet rising over the photograph. Positioned inside the image
            container, not after it, so the transparent half of the band shows
            the photograph rather than the section behind it — which is what put
            a black strip across the page when this sat outside. */}
        <PaperBand className="absolute bottom-0 left-0 right-0 z-[1]" />

        <div className="relative z-[2] min-h-[560px] sm:min-h-[640px] lg:min-h-[calc(100svh-var(--nav-h))] flex items-center page-gutter py-20">
          <div className="max-w-[520px]">
            <h1 className="type-akari-display text-[clamp(36px,5.6vw,68px)] text-washi text-balance mb-6">
              Made by hand.
              <br />
              Made to keep.
            </h1>
            <p className="text-[17px] sm:text-[18px] leading-[1.65] text-washi/85 max-w-[400px] mb-9">
              Amigurumi, flowers and cozy decor, crocheted one piece at a time in a
              small studio. If you don&apos;t see it, we&apos;ll make it.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Link
                href="/shop"
                data-slot="button"
                className="group inline-flex items-center justify-between gap-6 bg-washi text-ink px-7 py-4 text-[14px] rounded-lg transition-colors duration-200 hover:bg-bamboo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi"
              >
                Shop the collection
                <Arrow />
              </Link>
              <Link
                href="/custom"
                data-slot="button"
                className="group inline-flex items-center justify-between gap-6 border border-washi/60 text-washi px-7 py-4 text-[14px] rounded-lg transition-colors duration-200 hover:border-washi hover:bg-washi/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi"
              >
                Request a custom piece
                <Arrow light />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* The count sits on the paper below the fold — a quiet fact, small and
          centred. The figure is read from the catalogue rather than written
          here. */}
      <div className="bg-washi pt-8 pb-10 sm:pb-14">
        <p className="text-center text-[14px] text-muted-foreground page-gutter">
          Crocheted in small batches. {pieceCount}{" "}
          {pieceCount === 1 ? "piece" : "pieces"} in the collection right now.
        </p>
      </div>
    </section>
  );
}

/* Drawn, not a glyph. One stroke weight, matching the reference's arrows. */
function Arrow({ light = false }: { light?: boolean }) {
  return (
    <svg
      aria-hidden
      width="22"
      height="10"
      viewBox="0 0 22 10"
      fill="none"
      className={`shrink-0 transition-transform duration-200 group-hover:translate-x-1 ${
        light ? "text-washi" : "text-vermilion"
      }`}
    >
      <path
        d="M0 5h20M16 1l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

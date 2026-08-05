import { cn } from "@/lib/utils";

/* A sheet of washi bowing under its own weight.
 *
 * This is the world's structural move and it replaces the straight divider
 * rule everywhere on the storefront: sections are separated by a curved paper
 * edge with bamboo rib lines running just inside it, exactly as the sheets do
 * on the drying rack.
 *
 * An SVG rather than a border-radius trick. The curve has to span the full
 * viewport width at any size while keeping a constant *visual* bow, and
 * `preserveAspectRatio="none"` on a wide viewBox is the only way to stretch one
 * authored curve across 320px and 2560px without the arc flattening out or the
 * element growing to absurd height. It is decorative and announced as such.
 */
export function PaperBand({
  fill = "var(--washi)",
  edge = "bottom",
  className = "",
}: {
  /** Which side of the band the sheet occupies.
   *
   * `bottom` (default) is a sheet *rising* from below: transparent on top so
   * the previous section or a photograph shows through, solid underneath, with
   * the curve as the boundary. That is every band between two sections.
   *
   * `top` is a sheet *hanging* from above — the case the nav needs, where the
   * header's own paper continues downward and its lower edge sags into
   * whatever is beneath. Getting this wrong is not subtle: a `bottom` band used
   * under the nav lays an opaque strip across the top of the hero with a hard
   * straight lower edge, which reads exactly like a white bar clipping the
   * photograph, because that is what it is.
   *
   * Implemented as a vertical flip rather than a second set of paths, so there
   * is one curve in this file and the two orientations cannot drift. The flip
   * also reverses the bow, which is correct: a sheet resting on something bulges
   * up, a sheet hanging off something sags down. */
  edge?: "top" | "bottom";
  /** The colour of the sheet. For `edge="bottom"` that is the background of the
   * section *after* the band; for `edge="top"` it is the background of the
   * element the band hangs from. The other side of the curve is transparent, so
   * whatever sits behind — the adjacent section, or a photograph when the band
   * is positioned absolutely over one — shows through. */
  fill?: string;
  className?: string;
}) {
  return (
    /* `cn` rather than template interpolation, and no `relative` baked in.
       Both matter: this wrapper is positioned absolutely by the hero and
       statically everywhere else, and a hardcoded `relative` here does not lose
       to a caller's `absolute` just by appearing earlier in the class string —
       position utilities are decided by CSS source order, so the band silently
       pinned itself to the top of the hero instead of the bottom. tailwind-merge
       resolves the conflict in the caller's favour, which is the only place it
       can be known. */
    <div aria-hidden className={cn("w-full leading-[0]", className)}>
      <svg
        viewBox="0 0 1440 72"
        preserveAspectRatio="none"
        className={cn("block w-full h-[40px] sm:h-[64px]", edge === "top" && "-scale-y-100")}
      >
        {/* The sheet itself. */}
        <path d="M0 72 L0 30 C 360 -6, 1080 -6, 1440 30 L1440 72 Z" fill={fill} />

        {/* The bamboo ribs. Four of them, drawn at full strength rather than
            behind a container opacity — the structure showing through the paper
            is the whole reason this world reads as made rather than rendered,
            and at 55% it was invisible against washi.
            The first rib sits exactly on the sheet's own edge, so the paper has
            a drawn boundary instead of a soft colour change. The last is dashed:
            on a real drying rack the far ribs break behind the sheet, and the
            dash is what keeps the band from reading as a flat swoosh. */}
        <path d="M0 30 C 360 -6, 1080 -6, 1440 30" fill="none" stroke="var(--bamboo)" strokeWidth="1.5" />
        <path d="M0 41 C 360 5, 1080 5, 1440 41" fill="none" stroke="var(--bamboo)" strokeWidth="1" />
        <path
          d="M0 52 C 360 16, 1080 16, 1440 52"
          fill="none"
          stroke="var(--bamboo)"
          strokeWidth="1"
          opacity="0.75"
        />
        <path
          d="M0 63 C 360 27, 1080 27, 1440 63"
          fill="none"
          stroke="var(--bamboo)"
          strokeWidth="1"
          opacity="0.6"
          strokeDasharray="7 6"
        />
      </svg>
    </div>
  );
}

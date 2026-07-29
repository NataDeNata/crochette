export interface ValueCard {
  title: string;
  body: string;
  bgClassName: string;
}

export const VALUES: ValueCard[] = [
  {
    title: "Handmade, always",
    body: "No factories, no machines — every piece passes through the same two hands, stitch by stitch.",
    bgClassName: "bg-[oklch(0.93_0.03_20)]",
  },
  {
    title: "Small batches",
    body: "We make in limited runs so quality never slips — if it's sold out, it's because we cared enough to slow down.",
    bgClassName: "bg-[oklch(0.92_0.035_150)]",
  },
  {
    title: "Made to last",
    body: "Durable cotton yarns and reinforced stitching mean these pieces are built to be loved for years.",
    bgClassName: "bg-[oklch(0.93_0.025_260)]",
  },
];

export interface CustomStep {
  n: string;
  title: string;
  body: string;
}

export const CUSTOM_STEPS: CustomStep[] = [
  { n: "1", title: "Tell us your vision", body: "Share the size, colors, and character you have in mind." },
  { n: "2", title: "We sketch & quote", body: "We'll confirm details and send a quote plus timeline." },
  { n: "3", title: "Stitched & shipped", body: "Your piece is handmade to order and shipped with care." },
];

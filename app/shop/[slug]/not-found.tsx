import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";

export default function ProductNotFound() {
  return (
    <section style={{ padding: "100px 48px", textAlign: "center" }}>
      <FadeIn>
        <div
          style={{
            fontSize: 13,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "oklch(0.5 0.05 20)",
            marginBottom: 16,
          }}
        >
          Shop
        </div>
        <h1
          style={{
            fontFamily: "var(--font-cormorant), serif",
            fontWeight: 500,
            fontSize: "clamp(32px,4vw,46px)",
            margin: "0 0 16px",
          }}
        >
          We couldn&apos;t find that piece
        </h1>
        <p style={{ fontSize: 15.5, color: "oklch(0.42 0.02 60)", maxWidth: 420, margin: "0 auto 32px", lineHeight: 1.6 }}>
          It may have sold out or been renamed. Take a look at the full collection instead.
        </p>
        <Button href="/shop">Back to shop</Button>
      </FadeIn>
    </section>
  );
}

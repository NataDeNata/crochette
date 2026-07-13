import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/motion/FadeIn";
import { VALUES } from "@/lib/data/about";

export const metadata: Metadata = {
  title: "About — Crochette",
  description: "A small studio, made from yarn and patience.",
};

export default function AboutPage() {
  return (
    <>
      <section style={{ padding: "80px 48px 64px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
        <FadeIn>
          <div>
            <div
              style={{
                fontSize: 13,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "oklch(0.5 0.05 20)",
                marginBottom: 14,
              }}
            >
              About
            </div>
            <h1
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontWeight: 500,
                fontSize: "clamp(34px,4.4vw,50px)",
                margin: "0 0 22px",
                lineHeight: 1.12,
              }}
            >
              A small studio, made from yarn and patience
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "oklch(0.4 0.02 60)", margin: "0 0 16px" }}>
              Crochette began as a way to slow down — turning simple skeins into bears, blossoms, and little
              companions for cozy homes.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "oklch(0.4 0.02 60)", margin: 0 }}>
              What started as a hobby on quiet evenings grew into a small studio, still run the same way: one hook,
              one skein, one piece at a time.
            </p>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div
            style={{
              aspectRatio: "4/5",
              borderRadius: 32,
              overflow: "hidden",
              background:
                "repeating-linear-gradient(115deg, oklch(0.88 0.04 150) 0 18px, oklch(0.92 0.03 150) 18px 36px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 13,
                color: "oklch(0.35 0.03 150)",
                background: "oklch(0.98 0.01 85 / 0.8)",
                padding: "8px 16px",
                borderRadius: 8,
              }}
            >
              maker photo — hands crocheting
            </span>
          </div>
        </FadeIn>
      </section>

      <section style={{ padding: "20px 48px 100px" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div
              style={{
                fontSize: 13,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "oklch(0.5 0.05 20)",
                marginBottom: 12,
              }}
            >
              Our values
            </div>
            <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 34, margin: 0 }}>
              What we believe in
            </h2>
          </div>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 32 }}>
          {VALUES.map((v, i) => (
            <FadeIn key={v.title} delay={i * 0.08}>
              <div style={{ padding: "36px 28px", borderRadius: 24, background: v.bg }}>
                <div style={{ fontFamily: "var(--font-cormorant), serif", fontStyle: "italic", fontSize: 26, marginBottom: 12 }}>
                  {v.title}
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: "oklch(0.35 0.03 60)", margin: 0 }}>{v.body}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <FadeIn>
        <section
          style={{
            margin: "0 32px 100px",
            padding: "56px 48px",
            borderRadius: 36,
            background: "oklch(0.9 0.045 20)",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500, fontSize: 30, margin: "0 0 14px" }}>
            Want to see it in your home?
          </h2>
          <p style={{ fontSize: 15, color: "oklch(0.32 0.03 20)", margin: "0 0 24px" }}>
            Browse the collection or tell us what you&apos;re dreaming up.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <Link
              href="/shop"
              style={{
                background: "oklch(0.28 0.02 60)",
                color: "oklch(0.98 0.01 85)",
                padding: "14px 30px",
                borderRadius: 30,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Shop the collection
            </Link>
            <Link
              href="/custom"
              style={{
                border: "1.5px solid oklch(0.28 0.02 60)",
                padding: "14px 30px",
                borderRadius: 30,
                fontSize: 14,
                fontWeight: 500,
                color: "oklch(0.28 0.02 60)",
              }}
            >
              Request custom order
            </Link>
          </div>
        </section>
      </FadeIn>
    </>
  );
}

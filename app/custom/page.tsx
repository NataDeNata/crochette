import type { Metadata } from "next";
import { FadeIn } from "@/components/motion/FadeIn";
import { CustomOrderPanel } from "@/components/custom/CustomOrderPanel";
import { StepThread } from "@/components/custom/StepThread";
import { CUSTOM_STEPS } from "@/lib/data/custom";

export const metadata: Metadata = {
  title: "Custom Orders — Crochette",
  description: "Tell us the size, colors, and character — we'll turn it into a one-of-a-kind piece.",
};

export default function CustomOrderPage() {
  return (
    <>
      <section style={{ padding: "72px 48px 56px", textAlign: "center" }}>
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
            Custom orders
          </div>
          <h1
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontWeight: 500,
              fontSize: "clamp(38px,5vw,58px)",
              margin: "0 0 16px",
            }}
          >
            Have something in mind?
          </h1>
          <p style={{ fontSize: 16, color: "oklch(0.42 0.02 60)", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
            Tell us the size, colors, and character — we&apos;ll turn it into a one-of-a-kind piece, made just for
            you.
          </p>
        </FadeIn>
      </section>

      <section
        style={{
          position: "relative",
          padding: "0 48px 90px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 24,
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <StepThread />
        {CUSTOM_STEPS.map((s, i) => (
          <FadeIn key={s.n} delay={i * 0.08}>
            <div style={{ textAlign: "center", padding: "0 12px" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "oklch(0.9 0.045 20)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: 18,
                  fontWeight: 600,
                  margin: "0 auto 14px",
                }}
              >
                {s.n}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "oklch(0.45 0.02 60)" }}>{s.body}</div>
            </div>
          </FadeIn>
        ))}
      </section>

      <FadeIn>
        <section
          style={{
            margin: "0 32px 100px",
            padding: 56,
            borderRadius: 36,
            background: "oklch(0.9 0.045 20)",
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            gap: 56,
            alignItems: "center",
          }}
        >
          <CustomOrderPanel />
        </section>
      </FadeIn>
    </>
  );
}

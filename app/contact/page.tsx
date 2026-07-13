import type { Metadata } from "next";
import { FadeIn } from "@/components/motion/FadeIn";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact — Crochette",
  description: "Questions about an order, shipping, or just want to say hello? We'd love to hear from you.",
};

const DETAILS = [
  { label: "Email", value: "hello@crochette.shop" },
  { label: "Instagram", value: "@crochette.studio" },
  { label: "Studio hours", value: "Mon–Fri, 9am–5pm" },
];

export default function ContactPage() {
  return (
    <section style={{ padding: "80px 48px 90px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64 }}>
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
            Contact
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
            Let&apos;s get in touch
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: "oklch(0.4 0.02 60)", margin: "0 0 32px", maxWidth: 420 }}>
            Questions about an order, shipping, or just want to say hello? We&apos;d love to hear from you.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {DETAILS.map((d) => (
              <div key={d.label}>
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    color: "oklch(0.5 0.04 20)",
                    marginBottom: 4,
                  }}
                >
                  {d.label}
                </div>
                <div style={{ fontSize: 16 }}>{d.value}</div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div style={{ padding: 40, borderRadius: 32, background: "oklch(0.9 0.045 20)" }}>
          <ContactForm />
        </div>
      </FadeIn>
    </section>
  );
}

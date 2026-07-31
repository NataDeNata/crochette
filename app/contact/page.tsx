import type { Metadata } from "next";
import { FadeIn } from "@/components/motion/FadeIn";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about an order, shipping, or just want to say hello? We'd love to hear from you.",
  openGraph: {
    title: "Contact — Crochette",
    description: "Questions about an order, shipping, or just want to say hello? We'd love to hear from you.",
  },
};

const DETAILS = [
  { label: "Email", value: "hello@crochette.shop" },
  { label: "Instagram", value: "@crochette.studio" },
  { label: "Studio hours", value: "Mon–Fri, 9am–5pm" },
];

export default function ContactPage() {
  return (
    <section className="pt-12 md:pt-20 page-gutter pb-[90px] grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
      <FadeIn>
        <div>
          <div className="text-[13px] tracking-[3px] uppercase text-[oklch(0.5_0.05_20)] mb-3.5">
            Contact
          </div>
          <h1 className="font-serif font-medium text-[clamp(34px,4.4vw,50px)] mb-[22px] leading-[1.12]">
            Let&apos;s get in touch
          </h1>
          <p className="text-base leading-[1.75] text-[oklch(0.4_0.02_60)] mb-8 max-w-[420px]">
            Questions about an order, shipping, or just want to say hello? We&apos;d love to hear from you.
          </p>
          <div className="flex flex-col gap-5">
            {DETAILS.map((d) => (
              <div key={d.label}>
                <div className="text-xs tracking-[1px] uppercase text-[oklch(0.5_0.04_20)] mb-1">
                  {d.label}
                </div>
                <div className="text-base">{d.value}</div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="p-6 sm:p-10 rounded-[24px] sm:rounded-[32px] bg-accent">
          <ContactForm />
        </div>
      </FadeIn>
    </section>
  );
}

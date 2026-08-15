import type { Metadata } from "next";
import { FadeIn } from "@/components/motion/FadeIn";
import { Sheet } from "@/components/layout/Sheet";
import { ContactForm } from "@/components/contact/ContactForm";
import { OG_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about an order, shipping, or just want to say hello? We'd love to hear from you.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact | Crochette",
    description: "Questions about an order, shipping, or just want to say hello? We'd love to hear from you.",
    images: [OG_IMAGE],
  },
};

const DETAILS = [
  { label: "Email", value: "hello@crochette.shop" },
  { label: "Instagram", value: "@crochette.studio" },
  // With the timezone. This studio ships internationally-adjacent enough that
  // "9am" alone is a different eight hours depending on who is reading it, and
  // it is the number a customer uses to decide whether a reply is late.
  { label: "Studio hours", value: "Mon–Fri, 9am–5pm (PHT, UTC+8)" },
];

export default function ContactPage() {
  return (
    <Sheet innerClassName="py-10 sm:py-14 lg:py-16">
      <div className="max-w-[1320px] mx-auto">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16">
          <FadeIn>
            <h1 className="type-sheet-display text-[clamp(34px,5vw,58px)] text-keyline text-balance max-w-[14ch]">
              Let&apos;s get in touch
            </h1>
            <p className="text-[17px] leading-[1.7] text-muted-foreground mt-5 max-w-[48ch]">
              Questions about an order, shipping, or just want to say hello?
              We&apos;d love to hear from you.
            </p>
            <dl className="mt-10 flex flex-col gap-5">
              {DETAILS.map((d) => (
                <div key={d.label}>
                  <dt className="type-sheet-spec text-keyline/55 mb-1">{d.label}</dt>
                  <dd className="text-[16px] text-keyline">{d.value}</dd>
                </div>
              ))}
            </dl>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="border-2 border-keyline p-6 sm:p-8">
              <ContactForm />
            </div>
          </FadeIn>
        </div>
      </div>
    </Sheet>
  );
}

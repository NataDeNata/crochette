import type { Metadata } from "next";
import Link from "next/link";
import { Confirm, PolicyPage, PolicySection } from "@/components/layout/PolicyPage";
import { OG_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Crochette collects, why, who else sees it, and how to have it deleted.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy | Crochette",
    description:
      "What Crochette collects, why, who else sees it, and how to have it deleted.",
    images: [OG_IMAGE],
  },
};

export default function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy"
      summary="A short, specific account of what this site collects and who it passes through. Written from what the code actually does rather than from a template."
      lastReviewed="6 August 2026"
    >
      <PolicySection heading="Who is responsible">
        <p>
          Crochette, a single-owner studio operating from{" "}
          <Confirm>[business address — required by the Data Privacy Act]</Confirm>.
          Questions and requests:{" "}
          <a href="mailto:hello@crochette.shop" className="underline">
            hello@crochette.shop
          </a>
          .
        </p>
      </PolicySection>

      <PolicySection heading="What we collect, and why">
        <p>
          <strong className="text-keyline">To send you an order:</strong> your name,
          email address, phone number and shipping address. Without these there is
          nothing to deliver and no way to tell you it is coming.
        </p>
        <p>
          <strong className="text-keyline">To quote a custom piece:</strong> what you
          describe, and any reference photographs you upload. Photographs are stored
          only so the studio can look at them while making your piece.
        </p>
        <p>
          <strong className="text-keyline">If you make an account:</strong> your email
          address, a hashed password (never the password itself), and any addresses you
          choose to save. Accounts are optional — you can buy as a guest.
        </p>
        <p>
          <strong className="text-keyline">To keep your cart:</strong> a cookie holding
          an identifier for it. It carries no personal information and is not used to
          advertise to you.
        </p>
      </PolicySection>

      <PolicySection heading="What we never see">
        <p>
          <strong className="text-keyline">Your card details.</strong> Payment happens on
          the payment provider&apos;s own page, not on this site. Card numbers, wallet
          credentials and bank logins are never sent to us and never stored here.
        </p>
      </PolicySection>

      <PolicySection heading="Who else your information passes through">
        <p>
          Running a store means using services, and each of these sees only the part it
          needs: the payment provider (order total and contact details, to take payment),
          the email provider (your email address, to send confirmations), the hosting and
          database providers (everything, as the store&apos;s infrastructure), and file
          storage for reference photographs.
        </p>
        <p>
          None of them are permitted to use your information for their own purposes.
          Nothing here is sold, and there is no advertising or third-party analytics
          tracking on this site.
        </p>
      </PolicySection>

      <PolicySection heading="If you sign in with Google">
        <p>
          We receive your name, email address and whether Google has verified that
          address — nothing else, and never your Google password. A verified address is
          also what lets us attach orders you placed as a guest to your new account.
        </p>
      </PolicySection>

      <PolicySection heading="How long it is kept">
        <p>
          Order records are kept for <Confirm>5 years</Confirm>, which is the period
          business records must be retained for. Custom order requests and reference
          photographs are kept for <Confirm>2 years</Confirm> unless you ask sooner.
          Account information is kept until you close the account.
        </p>
      </PolicySection>

      <PolicySection heading="Your rights">
        <p>
          Under the Data Privacy Act of 2012 you can ask what is held about you, have it
          corrected, have it deleted, or object to how it is used. Write to{" "}
          <a href="mailto:hello@crochette.shop" className="underline">
            hello@crochette.shop
          </a>{" "}
          and you will get an answer within <Confirm>15 days</Confirm>. If you are not
          satisfied you can complain to the National Privacy Commission.
        </p>
        <p>
          Deleting an account does not erase orders already placed — those are the
          business records above.
        </p>
      </PolicySection>

      <PolicySection heading="Cookies">
        <p>
          Three, all of them necessary: one identifying your cart, one keeping you
          signed in if you have an account, and one holding the intermediate step of an
          admin login. There are no advertising or tracking cookies, which is why this
          site has no cookie banner.
        </p>
      </PolicySection>

      <PolicySection heading="Changes">
        <p>
          If this changes materially, the date at the top changes with it. See also{" "}
          <Link href="/terms" className="underline">terms</Link>.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}

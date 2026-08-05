import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { CartProvider } from "@/lib/cart/CartContext";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/lib/auth";
import { getCart } from "@/app/cart/actions";

// One variable family across the whole storefront. Jost ships a `wght` axis and
// next/font loads that by default, which is all this world needs: display sits
// at 300 and body at 400, per the quality-bar board's specimen.
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  display: "swap",
});

const SITE_NAME = "Crochette";
const SITE_DESCRIPTION =
  "Handmade crochet decor and companions, stitched with quiet care. Shop the collection or request a custom piece.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Handmade crochet decor`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["crochet", "amigurumi", "handmade crochet", "crochet decor", "custom crochet order", "Philippines"],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Handmade crochet decor`,
    description: SITE_DESCRIPTION,
    locale: "en_PH",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Handmade crochet decor`,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  // Washi ivory — the storefront ground. This is browser-chrome colour on
  // mobile, and the storefront is the only surface the public ever sees.
  themeColor: "#F7F2E6",
};

/* The direction contract for the storefront overhaul.
 *
 * Emitted as a real HTML comment rather than a JSX `{/* *\/}` one, which React
 * strips before it reaches the markup. A contract nobody can grep out of the
 * built output is a contract nobody can audit, so it rides in a hidden div's
 * innerHTML — the wrapper is the price of React not being able to render a
 * bare comment node. */
const DIRECTION_CONTRACT = `<!--
THESIS: A workshop, not a boutique. The refusal is the calm cream product grid
with a serif headline — here the material is the subject, lit and photographed
at work, and the page is made of paper that bows.
OWN-WORLD: Washi ivory ground, paper beige cards, bamboo tan rib lines,
charcoal ink, and exactly one vermilion — a stamp, an arrow, an active state,
never a field. Sections divide on bowed paper bands rather than straight rules.
Jost at 300 for display, 400 for body. Soft 6px edges; nothing is a pill.
STORY: The visitor sees the material and the hand that works it, believes one
person makes these, and either buys a piece or starts a commission.
FIRST VIEWPORT: Full-bleed warm workshop photograph held between two bowed
paper bands, nav riding the upper band. Light display headline left, two lines
of body, one paper-filled action with a vermilion arrow.
FORM: Akari workshop — dealt challenger, chosen over the assigned direction,
seed key d5347c59.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Only the customer role matters to the storefront chrome (admin sessions
  // never render Nav/Footer — see SiteChrome's /admin special-case).
  const session = await auth();

  // Read the cart during render so the nav badge is correct on the very first
  // frame instead of painting 0 and popping. This costs nothing in rendering
  // strategy: `auth()` above already reads cookies, so the layout — and with
  // it every page — is dynamic regardless. getCart() is the read-only path and
  // never creates a cart or sets a cookie, which it could not do here anyway
  // (Next forbids setting cookies during render).
  const initialCart = await getCart();

  return (
    <html lang="en" className={cn(jost.variable, "font-sans")}>
      <body>
        <div hidden dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />
        <div className="relative">
          <CartProvider initialCart={initialCart}>
            <SiteChrome session={session}>{children}</SiteChrome>
          </CartProvider>
        </div>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}

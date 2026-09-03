import type { Metadata, Viewport } from "next";
import { Jost, Gloock, Archivo } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { CartProvider } from "@/lib/cart/CartContext";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/lib/auth";
import { getCart } from "@/app/cart/actions";
import { hasFeaturedGallery } from "@/lib/data/gallery";
import { JsonLd } from "@/components/seo/JsonLd";

// One variable family across the whole storefront. Jost ships a `wght` axis and
// next/font loads that by default, which is all this world needs: display sits
// at 300 and body at 400, per the quality-bar board's specimen.
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  display: "swap",
});

// The cut-out sheet's two faces. Gloock carries the printed titles: a fat
// didone with hairline joins and a real vertical stress, which is what titles
// on mid-century printed toy and pattern sheets were actually set in.
//
// It replaced a heavy grotesque that rendered as Arial Black — technically a
// different font, visually the platform display face, and the one voice an
// own-world page cannot borrow. Gloock ships a single weight, which is correct
// here: a press sheet's title block has one size of type in one cut, and a
// weight ramp would be a UI habit imported into a printed artifact.
//
// Archivo does the reading. It is a grotesk drawn for signage and small sizes,
// so the tabs, prices and press-out instructions stay legible at 11px, where
// a didone's hairlines would disappear.
const gloock = Gloock({
  variable: "--font-gloock",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const SITE_NAME = "Yarns and Buttons";
const SITE_DESCRIPTION =
  "Handmade crochet decor and companions, stitched with quiet care. Shop the collection or request a custom piece.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Handmade crochet decor`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Every page sets its own; this is the fallback for any that forgets.
  // `metadataBase` above resolves the relative path.
  alternates: { canonical: "/" },
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
    title: `${SITE_NAME} | Handmade crochet decor`,
    description: SITE_DESCRIPTION,
    locale: "en_PH",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Handmade crochet decor`,
    description: SITE_DESCRIPTION,
  },
};

/* Who the site is, and what it is, for a crawler.
 *
 * The product pages have carried `Product`/`Offer` since the SEO pass; the two
 * most-shared URLs on the site — home and /shop — carried nothing. These sit
 * in the root layout so every page states them, which is what lets a search
 * result show the studio's name and socials rather than just a page title.
 * The email and Instagram handle here are the same two the footer prints. */
const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      email: "hello@crochette.shop",
      sameAs: ["https://instagram.com/crochette.studio"],
      areaServed: "PH",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-PH",
    },
  ],
};

export const viewport: Viewport = {
  // The viridian ground, not the sheet. Mobile browser chrome sits above the
  // page, and above the sheet is ground — matching it to the white sheet would
  // make the phone's chrome look like a torn-off strip of the artwork.
  themeColor: "#0E4F44",
};

/* The direction contract for the storefront overhaul.
 *
 * Emitted as a real HTML comment rather than a JSX `{/* *\/}` one, which React
 * strips before it reaches the markup. A contract nobody can grep out of the
 * built output is a contract nobody can audit, so it rides in a hidden div's
 * innerHTML — the wrapper is the price of React not being able to render a
 * bare comment node. */
const DIRECTION_CONTRACT = `<!--
THESIS: A press-out sheet, not a storefront. The refusal is the calm ivory
product grid — here every piece is a die-cut figure printed on one sheet,
waiting to be cut loose, and buying is taking it off the page.
OWN-WORLD: Deep viridian ground with a bright white printed sheet laid on it,
hard near-black keylines, dashed cut lines, fold tabs, corner trim marks, and
four flat press colours — press red, butter, aqua, rose. Bricolage Grotesque
heavy for sheet titles, Archivo for everything read. No decorative background
imagery: photography appears only inside a die-cut window, as evidence.
STORY: The visitor sees real pieces printed as cut-outs, believes one person
makes each one, and either presses one out or orders a figure that isn't on
the sheet yet.
FIRST VIEWPORT: One white sheet edge-to-edge on viridian, trim marks at its
corners. Title left at masthead scale, two actions as keyline tabs beneath it;
the hero piece right as a tabbed cut-out ringed by a dashed cut line.
FORM: Cut-out sheet — assigned direction, candidate 5 of 7, roll 3 of this
session (rolls 1 and 2 were re-rolled by the user).
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

  // Existence check, not a fetch: the nav and footer only need to know whether
  // /gallery has anything on it before linking to it. See hasFeaturedGallery.
  const hasGallery = await hasFeaturedGallery();

  return (
    <html
      lang="en"
      className={cn(jost.variable, gloock.variable, archivo.variable, "font-sans")}
    >
      <body>
        <JsonLd data={SITE_JSON_LD} />
        <div hidden dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />
        <div className="relative">
          <CartProvider initialCart={initialCart}>
            <SiteChrome session={session} hasGallery={hasGallery}>
              {children}
            </SiteChrome>
          </CartProvider>
        </div>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}

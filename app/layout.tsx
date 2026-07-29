import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Work_Sans } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { CartProvider } from "@/lib/cart/CartContext";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/lib/auth";
import { getCart } from "@/app/cart/actions";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const workSans = Work_Sans({
  variable: "--font-work",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
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
  themeColor: "#f8f4ee",
};

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
    <html lang="en" className={cn(cormorant.variable, workSans.variable, "font-sans")}>
      <body>
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

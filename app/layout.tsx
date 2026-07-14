import type { Metadata } from "next";
import { Cormorant_Garamond, Work_Sans } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { CartProvider } from "@/lib/cart/CartContext";

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

export const metadata: Metadata = {
  title: "Crochette — Handmade crochet decor",
  description:
    "Handmade crochet decor and companions, stitched with quiet care. Shop the collection or request a custom piece.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${workSans.variable}`}>
      <body>
        <div style={{ maxWidth: 1440, margin: "0 auto", position: "relative", overflow: "hidden" }}>
          <CartProvider>
            <SiteChrome>{children}</SiteChrome>
          </CartProvider>
        </div>
      </body>
    </html>
  );
}

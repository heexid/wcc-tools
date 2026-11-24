import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// Figma renders CIR text with Inter 3.x (variable axes slnt + wght), not the Inter 4
// (opsz axis) served by Google Fonts — glyph widths differ at 10–13 px. Self-host
// Inter 3.19 so text measures 1:1 with Figma (F0 text-metrics test).
const inter = localFont({
  src: "./fonts/Inter-3.19-roman.var.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "block",
});

export const metadata: Metadata = {
  title: "CIR · Booking",
  description: "Booking & Invoice prototype",
  manifest: "/manifest.json",
  // Link previews. The image is opengraph-image.jpg (Figma "Fav Icon & Social Banner"); signed-out visitors land on
  // /login, so every page shares the landing copy. Absolute URLs come from Vercel's production domain.
  openGraph: {
    type: "website",
    siteName: "CIR",
    title: "CIR · Every booking, every schedule, one place",
    description: "Packages, payments and invoices, with clarity and centralised",
  },
  twitter: { card: "summary_large_image" },
};

// viewport-fit=cover lets sticky bottom bars read env(safe-area-inset-bottom) (DS › Mobile rules).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import localFont from "next/font/local";
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
  title: "bs.moment · Booking",
  description: "Booking & Invoice prototype",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}

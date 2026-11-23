import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import "@/styles/landing.css";

// The public marketing landing page (Figma "Landing Page" › LP-D / LP-T / LP-M). Signed-out and signed-in visitors
// both see it; "Log in" goes to /login, every get-started CTA to /get-started. The dev gallery stays at /dev.
export const metadata: Metadata = {
  title: "CIR · Every booking, every schedule, one place",
  description: "Bookings, packages, payments and invoices in one place, with totals that add up themselves",
};

export default function Home() {
  return <LandingPage />;
}

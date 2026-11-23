import type { ReactNode } from "react";
import { SeedCache } from "@/lib/data/SeedCache";
import { dashboardSeed } from "@/lib/data/supabase/dashboard-seed";

// /bookings only (route group — New / Edit / detail pages don't get it). With DATA_SOURCE=supabase the dashboard's
// first reads start here, on the server, and stream in with the page (lib/data/supabase/dashboard-seed.ts). Not
// awaited: the page renders at once. A layout, not the page, so filter / tab / panel URL changes (which re-render
// the page on the server) don't repeat the reads. Mock data lives in the browser, so there is nothing to start.
export default function BookingsDashboardLayout({ children }: { children: ReactNode }) {
  const seed = process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase" ? dashboardSeed() : null;
  return <SeedCache seed={seed}>{children}</SeedCache>;
}

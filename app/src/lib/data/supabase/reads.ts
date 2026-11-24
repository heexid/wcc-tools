// Supabase reads that take the client to use: the browser client (./repo.ts) and the server client (the Bookings
// dashboard's streamed first reads, ./dashboard-seed.ts) run exactly the same RPCs and return the same shapes.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import type { BookingQuery, BookingRow, PackageRow } from "../repo";
import type * as Mock from "../repo";
import { NetworkError } from "../shared";

export type Sb = SupabaseClient<Database>;

/** A read failure that isn't a rule (offline, 5xx, RLS denial) → NetworkError, like the mock's failNext(). */
export async function rpc<T>(sb: Sb, op: string, fn: string, args: Record<string, unknown> = {}): Promise<T> {
  let res;
  try {
    res = await sb.rpc(fn as never, args as never);
  } catch {
    throw new NetworkError(op);
  }
  if (res.error) throw new NetworkError(op);
  return res.data as T;
}

export const listPackagesWith = (sb: Sb, q: { tab?: "active" | "archived"; search?: string } = {}) =>
  rpc<PackageRow[]>(sb, "listPackages", "list_packages", { p_tab: q.tab ?? null, p_search: q.search ?? null });

/** Packages + crew (every crew member incl. inactive, every package incl. archived). */
export async function filterCatalogWith(sb: Sb): ReturnType<typeof Mock.loadFilterCatalog> {
  const [packages, crewRes] = await Promise.all([listPackagesWith(sb), sb.from("crew").select("id, name, role, is_active, user_id").order("created_at").order("id")]);
  if (crewRes.error) throw new NetworkError("loadCatalog");
  return {
    packages: packages.map(({ bookings: _b, ...p }) => p),
    crew: crewRes.data.map((c) => ({ id: c.id, name: c.name, role: c.role, isActive: c.is_active, userId: c.user_id })),
  };
}

export const listAllBookingsWith = (sb: Sb, q: BookingQuery = {}) => rpc<BookingRow[]>(sb, "listBookings", "list_all_bookings", { q });
export const countBookingsWith = (sb: Sb) => rpc<number>(sb, "listBookings", "count_bookings");
export const getKpisWith = (sb: Sb, ym: string) => rpc<Awaited<ReturnType<typeof Mock.getKpis>>>(sb, "getKpis", "get_kpis", { p_ym: ym });

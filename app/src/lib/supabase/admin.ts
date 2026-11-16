// Service-role client — SERVER ONLY. Bypasses RLS, so use it only after the caller's own session has been checked
// (e.g. the invoice was read through supabaseServer() first). Never import from client code.
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

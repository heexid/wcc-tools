// Browser Supabase client (reads under RLS). The session lives in cookies (@supabase/ssr), so Server Actions
// see the same user. One client per tab.
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function supabaseBrowser() {
  client ??= createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookieOptions: authCookieOptions });
  return client;
}

import { authCookieOptions } from "./cookie";
export { authCookieName, isAuthCookie } from "./cookie";

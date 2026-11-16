// Server Supabase client for Server Actions and Route Handlers: the user's session from the request cookies,
// refreshed tokens written back. Never import from client code (server-only makes that a build error).
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/db/database.types";
import { authCookieOptions } from "./cookie";

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        // Throws when called during a Server Component render; Server Actions and Route Handlers can set.
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {}
      },
    },
  });
}

// Environment contract, validated when `next.config.ts` loads — so `next build`, `next dev` and
// `next start` fail on a missing or forbidden variable instead of failing on a request.
import { z } from "zod";

const APP_ENVS = ["development", "test", "staging", "production"] as const;
const hosted = (e: string) => e === "staging" || e === "production";

const schema = z
  .object({
    APP_ENV: z.enum(APP_ENVS),
    DATA_SOURCE: z.enum(["mock", "supabase"]),
    NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    // Server only. Never prefix with NEXT_PUBLIC_.
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SENTRY_DSN: z.url().optional(),
    // Test-only switches.
    NEXT_PUBLIC_TODAY: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD").optional(),
    NEXT_PUBLIC_LATENCY: z.string().regex(/^\d+$/).optional(),
  })
  .superRefine((e, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

    if (hosted(e.APP_ENV) && e.DATA_SOURCE === "mock") add("DATA_SOURCE", `"mock" is not allowed when APP_ENV=${e.APP_ENV}`);

    if (e.DATA_SOURCE === "supabase") {
      if (!e.NEXT_PUBLIC_SUPABASE_URL) add("NEXT_PUBLIC_SUPABASE_URL", "required when DATA_SOURCE=supabase");
      if (!e.NEXT_PUBLIC_SUPABASE_ANON_KEY) add("NEXT_PUBLIC_SUPABASE_ANON_KEY", "required when DATA_SOURCE=supabase");
      if (hosted(e.APP_ENV) && !e.SUPABASE_SERVICE_ROLE_KEY) add("SUPABASE_SERVICE_ROLE_KEY", "required when DATA_SOURCE=supabase in staging/production");
    }

    if (e.APP_ENV !== "test" && e.NEXT_PUBLIC_TODAY) add("NEXT_PUBLIC_TODAY", "frozen clock is only allowed when APP_ENV=test");
    if (hosted(e.APP_ENV) && e.NEXT_PUBLIC_LATENCY) add("NEXT_PUBLIC_LATENCY", "simulated latency is not allowed in staging/production");
  });

export type Env = z.infer<typeof schema>;

/** NODE_ENV=production without an explicit APP_ENV is production; anything else is development. */
export function resolveAppEnv(source: Record<string, string | undefined>): string {
  return source.APP_ENV || (source.NODE_ENV === "production" ? "production" : "development");
}

export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  // A service-role key must never reach the browser: refuse any public variable that looks like one.
  const leaked = Object.keys(source).filter((k) => k.startsWith("NEXT_PUBLIC_") && /SERVICE|SECRET/i.test(k));
  if (leaked.length) throw new Error(`Invalid environment: ${leaked.join(", ")} would be exposed to the browser. Remove the NEXT_PUBLIC_ prefix.`);

  const blank = (v: string | undefined) => (v === "" ? undefined : v);
  const result = schema.safeParse({
    APP_ENV: resolveAppEnv(source),
    // Hosted builds default to Supabase; local dev and tests default to the mock (no keys needed).
    DATA_SOURCE: blank(source.DATA_SOURCE) ?? (hosted(resolveAppEnv(source)) ? "supabase" : "mock"),
    NEXT_PUBLIC_SUPABASE_URL: blank(source.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: blank(source.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: blank(source.SUPABASE_SERVICE_ROLE_KEY),
    SENTRY_DSN: blank(source.SENTRY_DSN),
    NEXT_PUBLIC_TODAY: blank(source.NEXT_PUBLIC_TODAY),
    NEXT_PUBLIC_LATENCY: blank(source.NEXT_PUBLIC_LATENCY),
  });
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join(".") || "(env)"}: ${i.message}`);
    throw new Error(`Invalid environment:\n${lines.join("\n")}\nSee .env.example.`);
  }
  return result.data;
}

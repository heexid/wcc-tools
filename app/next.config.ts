import type { NextConfig } from "next";
import { parseEnv } from "./src/env";

// Fails the build / dev server / `next start` on a missing or forbidden variable (src/env.ts).
const env = parseEnv();

// Dev surface (/dev/* gallery, reset, role switch) lives in `page.dev.tsx` files. They are routes only
// in local development and test builds; in staging / production they are not compiled at all.
const devTools = env.APP_ENV === "development" || env.APP_ENV === "test";

// Data source swap (PRODUCTION-PLAN §0.1 "single swap point"): components import "@/lib/data/repo"; with
// DATA_SOURCE=supabase that resolves to the Supabase implementation, so the mock (seed, store) is not bundled.
// tsc / Vitest keep the mock; src/lib/data/supabase/contract.check.ts keeps the two in step.
const aliases: Record<string, string> = {
  ...(devTools ? {} : { "@/lib/data/fixtures": "./src/lib/data/fixtures.stub.ts" }),
  ...(env.DATA_SOURCE === "supabase" ? { "@/lib/data/repo": "./src/lib/data/supabase/repo.ts" } : {}),
};

// Security headers (P10, PRD §4.4). CSP: this site + the Supabase project only. Next's inline bootstrap needs
// 'unsafe-inline' for scripts (no nonce pipeline yet); dev adds 'unsafe-eval' + websockets for React / HMR.
const supabaseOrigin = env.NEXT_PUBLIC_SUPABASE_URL ? new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
const hosted = env.APP_ENV === "staging" || env.APP_ENV === "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${devTools ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin}${devTools ? " ws: wss:" : ""}`.trim(),
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(hosted ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // A second build (e.g. the Supabase smoke, playwright.supabase.config.ts) can use its own folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  pageExtensions: devTools ? ["tsx", "ts", "dev.tsx"] : ["tsx", "ts"],
  env: { NEXT_PUBLIC_APP_ENV: env.APP_ENV, NEXT_PUBLIC_DEV_TOOLS: devTools ? "1" : "0", NEXT_PUBLIC_DATA_SOURCE: env.DATA_SOURCE },
  // Dev badge would sit inside every G3 screenshot (bottom-left of the 1440 frame).
  devIndicators: false,
  // A logo up to 1 MB (US-14) travels base64-encoded in the Server Action body (+33 %): above Next's 1 MB default.
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  // The PDF route reads Inter from public/fonts/pdf at runtime; trace the files into its serverless bundle
  // (public/ alone goes to the CDN on Vercel) — P9 review #2.
  outputFileTracingIncludes: { "/api/invoices/[id]/pdf": ["./public/fonts/pdf/**"] },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // Fixtures (?fixture=screen-NN) are a dev/test affordance; hosted builds get a no-op stub.
    resolveAlias: aliases,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

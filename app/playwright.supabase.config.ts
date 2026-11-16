import { defineConfig, devices } from "@playwright/test";

// P3 smoke: the production build on the Supabase data source against the LOCAL stack (`supabase start`).
// Real auth, real clock, no dev hooks (APP_ENV=staging compiles them out). One worker: the tests share one DB,
// which global-setup resets to the seed first.
//   NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… npm run e2e:supabase
const PORT = 3200;

export default defineConfig({
  testDir: "./tests/e2e-supabase",
  globalSetup: "./tests/e2e-supabase/global-setup.ts",
  fullyParallel: false,
  // A production build against a Docker stack is slower than the mock dev server; generous waits keep a busy
  // machine (or CI runner) from turning into false failures. Real hangs still fail.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    timezoneId: "Asia/Jakarta",
    locale: "en-US",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      APP_ENV: "staging",
      DATA_SOURCE: "supabase",
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", // server-only (P9 PDF route)
      NEXT_DIST_DIR: ".next-supabase",
    },
  },
});

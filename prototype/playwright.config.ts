import { defineConfig, devices } from "@playwright/test";

// 1440-wide desktop, 1× pixels, frozen clock (Figma "today" = 2026-11-10), reduced motion.
// PROTOTYPE-PLAN §0.3 gates G2–G4 run with animations off.
const PORT = 3100;

export default defineConfig({
  testDir: "./tests",
  testMatch: ["e2e/**/*.spec.ts", "visual/**/*.spec.ts"],
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    timezoneId: "Asia/Jakarta",
    locale: "en-US",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/dev`,
    reuseExistingServer: true,
    env: { NEXT_PUBLIC_TODAY: "2026-11-10" },
    timeout: 120_000,
  },
});

import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["tests/unit/**/*.test.ts", "src/**/*.test.ts"], environment: "node", env: { NEXT_PUBLIC_TODAY: "2026-11-10" } },
});

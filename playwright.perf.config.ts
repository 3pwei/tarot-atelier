import { defineConfig, devices } from "@playwright/test";

/** Port for the static export while measuring; distinct from `next dev`. */
const PERF_PORT = 4310;

/**
 * Smoothness measurements on the production build with a throttled CPU.
 * Run with `pnpm perf`; set PERF_CPU_SLOWDOWN to change the throttle.
 */
export default defineConfig({
  testDir: "./perf",
  testMatch: "**/*.perf.ts",
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PERF_PORT}`,
    // e.g. PERF_BROWSER_CHANNEL=chrome to measure with an installed Chrome.
    channel: process.env.PERF_BROWSER_CHANNEL,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-375",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 3,
      },
    },
  ],
  webServer: {
    command: `node perf/support/serveExport.ts ${PERF_PORT}`,
    url: `http://127.0.0.1:${PERF_PORT}`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

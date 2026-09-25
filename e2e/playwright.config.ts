import { defineConfig, devices } from "@playwright/test";

/**
 * The suite runs against the full stack started from `compose.yaml`:
 * PostgreSQL plus the FastAPI app serving the built frontend on port 8000.
 *
 * Start it yourself with `docker compose up --build -d`, or let `task e2e`
 * orchestrate it. Override the target with PLAYWRIGHT_BASE_URL.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8000";

export default defineConfig({
  testDir: "./tests",
  // Tests mutate shared league data, so they must not race each other.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

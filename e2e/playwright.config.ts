import { defineConfig, devices } from "@playwright/test";

/**
 * These tests run against an already-deployed instance of the app (for example
 * the Render web service). They never build or start the application: point
 * them at a URL with PLAYWRIGHT_BASE_URL.
 */
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL?.trim() || "http://localhost:8000";

const CHANNELS = ["chrome", "msedge", "chromium"] as const;
type SupportedChannel = (typeof CHANNELS)[number];
type ChannelSetting = SupportedChannel | "bundled";

/**
 * Pick the browser to drive.
 *
 * Default: "chrome", which reuses the Google Chrome already installed on the
 * machine. CI runners (e.g. GitHub Actions ubuntu-latest) ship Chrome, so this
 * needs no browser download. Set PLAYWRIGHT_CHANNEL=bundled to use Playwright's
 * managed Chromium instead (`npm run install:browsers` fetches it once).
 */
function resolveChannel(): ChannelSetting {
  const requested = process.env.PLAYWRIGHT_CHANNEL?.trim().toLowerCase();
  if (requested === "bundled") return "bundled";
  if (requested && (CHANNELS as readonly string[]).includes(requested)) {
    return requested as SupportedChannel;
  }
  return "chrome";
}

const channel = resolveChannel();

export default defineConfig({
  testDir: "./tests",
  // Tests mutate shared league data, so they must not race each other.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    ...(channel === "bundled" ? {} : { channel }),
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

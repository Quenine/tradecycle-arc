import { defineConfig, devices } from "@playwright/test"

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL
const baseURL = externalBaseUrl ?? "http://127.0.0.1:3010"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", video: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: externalBaseUrl ? undefined : {
    command: "npm run build && npm run start -- -H 127.0.0.1 -p 3010",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 240_000,
  },
})

import { defineConfig, devices } from "@playwright/test";

const previewHost = "127.0.0.1";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  outputDir: "test-results/playwright",
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    deviceScaleFactor: 1,
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.001,
      animations: "disabled",
    },
  },
  webServer: [
    {
      command: `npx vite build && npx vite preview --port 5173 --strictPort --host ${previewHost}`,
      cwd: "packages/editor",
      url: `http://${previewHost}:5173`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: `npx vite build && npx vite preview --port 5174 --strictPort --host ${previewHost}`,
      cwd: "packages/runtime",
      url: `http://${previewHost}:5174`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: `tsx scripts/export-e2e-fixture.mts && tsx scripts/serve-static.mts e2e/fixtures/exported-game/game 5175 ${previewHost}`,
      url: `http://${previewHost}:5175`,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      testMatch: /runtime-(screenshots|phase2)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://${previewHost}:5174`,
        viewport: { width: 520, height: 420 },
      },
    },
    {
      name: "editor",
      testMatch: /editor-(flow|tabs|export-loop)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://${previewHost}:5173`,
        viewport: { width: 1100, height: 820 },
      },
    },
    {
      name: "export",
      testMatch: /export-(play|variants)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://${previewHost}:5175`,
        viewport: { width: 520, height: 420 },
      },
    },
  ],
});

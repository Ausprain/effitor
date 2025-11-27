import { defineConfig } from '@playwright/test'

export default defineConfig({
  // Look for test files in the "tests" directory, relative to this configuration file.
  testDir: 'tests',

  // Run all tests in parallel.
  fullyParallel: true,
  timeout: 3 * 60_000,
  retries: 0,

  use: {
    headless: true, // 无头模式，减少渲染开销
    viewport: { width: 1280, height: 720 },
    // 禁用缓存
    storageState: undefined,
    contextOptions: {
      bypassCSP: true,
    },
  },

  // // Fail the build on CI if you accidentally left test.only in the source code.
  // forbidOnly: !!process.env.CI,

  // // Retry on CI only.
  // retries: process.env.CI ? 2 : 0,

  // // Opt out of parallel tests on CI.
  // workers: process.env.CI ? 1 : undefined,

  // // Reporter to use
  // reporter: 'html',

  // use: {
  //   // Base URL to use in actions like `await page.goto('/')`.
  //   baseURL: 'http://localhost:3000',

  //   // Collect trace when retrying the failed test.
  //   trace: 'on-first-retry',
  // },
  // // Configure projects for major browsers.
  // projects: [
  //   {
  //     name: 'chromium',
  //     use: { ...devices['Desktop Chrome'] },
  //   },
  // ],
  // // Run your local dev server before starting the tests.
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
})

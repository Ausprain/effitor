import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['./src/**/*.test.ts'],
    // inspectBrk: true,
    // fileParallelism: false,
    browser: {
      provider: 'playwright', // or 'webdriverio'
      enabled: true,
      // at least one instance is required
      instances: [
        { browser: 'chromium' },
      ],
    },
    benchmark: {
      include: ['./src/**/*.bench.ts'],
    },
  },
})

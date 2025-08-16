import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: [
            '**/tests/unit/**/*.test.ts',
            '**/tests/**/*.unit.test.ts',
          ],
          environment: 'happy-dom',
        },
      },
      {
        test: {
          name: 'intg',
          include: [
            '**/tests/intg/**/*.test.ts',
            '**/tests/**/*.intg.test.ts',
          ],
          environment: 'happy-dom',
        },
      },
      {
        test: {
          name: 'e2e',
          include: [
            '**/tests/e2e/**/*.test.ts',
            '**/tests/**/*.e2e.test.ts',
          ],
          browser: {
            provider: 'playwright',
            enabled: true,
            // headless: true,
            instances: [
              { browser: 'chromium' },
            ],
          },
        },
      },
    ],
  },
})

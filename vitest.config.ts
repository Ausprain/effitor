import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    projects: [
      {
        extends: true, // 继承基础配置
        test: {
          name: 'unit',
          include: [
            '**/__tests__/unit/**/*.test.ts',
            '**/__tests__/**/*.unit.test.ts',
            '**/*.unit.test.ts',
          ],
          environment: 'happy-dom',
        },
      },
      {
        extends: true,
        test: {
          name: 'intg',
          include: [
            '**/__tests__/intg/**/*.test.ts',
            '**/__tests__/**/*.intg.test.ts',
            '**/*.intg.test.ts',
          ],
          environment: 'happy-dom',
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: [
            '**/__tests__/e2e/**/*.test.ts',
            '**/__tests__/**/*.e2e.test.ts',
            '**/*.e2e.test.ts',
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

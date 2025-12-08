import { defineConfig } from 'tsup'

import sharedConfig from '../../tsup.shared'

export default defineConfig({
  ...sharedConfig,
  external: ['@shikijs'],
})

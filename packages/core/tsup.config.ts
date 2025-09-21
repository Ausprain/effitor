import fs from 'fs-extra'
import { defineConfig } from 'tsup'

import sharedConfig from '../../tsup.shared'

export default defineConfig({
  ...sharedConfig,
  onSuccess: async () => {
    if (!fs.existsSync('./dist/styles')) {
      fs.mkdirSync('./dist/styles', { recursive: true })
    }
    fs.copySync('./src/assets/fonts', './dist/styles/fonts')
    fs.copySync('./src/assets/font.css', './dist/styles/font.css')
  },
})

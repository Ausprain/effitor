// tsup.config.ts
import fs from 'fs-extra'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/**/*.css'],
  format: ['esm'],
  outDir: 'dist',
  bundle: true,
  clean: true,
  minify: true, // 启用压缩
  sourcemap: false, // 不需要 sourcemap
  esbuildOptions(options) {
    options.loader = {
      ...options.loader,
      '.css': 'css',
    }
    options.entryNames = '[dir]/[name].min'
    options.minifyWhitespace = true
    options.minifyIdentifiers = false
    options.minifySyntax = true
    options.external = ['*.woff2', '*.woff', '*.ttf', '*.eot']
  },
  onSuccess: async () => {
    fs.copySync('./src', './dist')
  },
})

import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        'effitor-rich': resolve(__dirname, 'src/effitor-rich.html'),
        'lexical-rich': resolve(__dirname, 'src/lexical-rich.html'),
        'tiptap-rich': resolve(__dirname, 'src/tiptap-rich.html'),
      },
      output: {
        manualChunks: undefined,
        entryFileNames: (chunkInfo) => {
          return `${chunkInfo.name}/[name].js`
        },
        chunkFileNames: (chunkInfo) => {
          return `${chunkInfo.name}/[name].js`
        },
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name?.split('.')[0] || 'unknown'
          return `${name}/[name].[ext]`
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
})

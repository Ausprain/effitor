import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        'effitor-rich': resolve(__dirname, 'src/effitor-rich.html'),
        'lexical-rich': resolve(__dirname, 'src/lexical-rich.html'),
        'tiptap-rich': resolve(__dirname, 'src/tiptap-rich.html'),
        // 执行 bun bundle 统计打包体积时需注释下面; 否则数据不对
        'effitor-plain': resolve(__dirname, 'src/effitor-plain.html'),
        'lexical-plain': resolve(__dirname, 'src/lexical-plain.html'),
        'tiptap-plain': resolve(__dirname, 'src/tiptap-plain.html'),
      },
      output: {
        manualChunks: {
          shiki: ['shiki'],
        },
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

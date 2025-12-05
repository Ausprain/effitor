import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    port: 3000,
    // open: true,
  },
  plugins: [
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        // 配置代码分割
        manualChunks: {
          // 将常用库单独打包
          'react-vendor': ['react', 'react-dom'],
          'i18n-vendor': ['i18next', 'react-i18next'],
          'code-highlight': ['shiki', 'katex'],
          'effitor': ['effitor'],
          'mdast-util': [
            'mdast-util-from-markdown',
            'mdast-util-frontmatter',
            'mdast-util-gfm',
            'mdast-util-newline-to-break',
            'mdast-util-to-markdown',
            'micromark-extension-frontmatter',
            'micromark-extension-gfm',
            'unist-util-visit',
          ],
        },
        // 配置 chunk 文件名
        chunkFileNames: 'assets/[name]-[hash].js',
        // 配置入口文件名
        entryFileNames: 'assets/[name]-[hash].js',
        // 配置资源文件名
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // 配置最小化选项
    // minify: 'esbuild',
    // 启用 CSS 代码分割
    cssCodeSplit: true,
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: ['react', 'react-dom', 'i18next', 'react-i18next'],
  },
})

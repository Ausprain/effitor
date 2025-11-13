import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    // 解析项目根目录的 tsconfig.json 中的路径别名
    // 直接从 ts 源码中导入，而不是从 node_modules 中导入，方便修改源码后直接调试
    tsconfigPaths(),
  ],
})

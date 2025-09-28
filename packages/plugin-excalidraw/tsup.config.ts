import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./src/index.tsx'],
  format: ['esm'],
  tsconfig: './tsconfig.build.json',
})

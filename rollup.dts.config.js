// @ts-check

import dts from  'rollup-plugin-dts'
import fs from 'node:fs'

if (!fs.existsSync('temp')) {
    console.warn('no temp dts file found, please run `tsc -p tsconfig.json` first.')
    process.exit(1)
}

/**
 * @type {import('rollup').RollupOptions}
 */
export default {
    input: 'temp/src/effitor/index.d.ts',
    output: {
        file: 'dist/index.d.ts',
        format: 'esm'
    },
    plugins: [dts({
        compilerOptions: {
            // 重新映射"@/*"
            paths: { "@/*": ["temp/src/*"] }
        }
    }),]
}
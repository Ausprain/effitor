// @ts-check

import esbuild from 'esbuild';
await esbuild.build({
    // entryPoints: ['src/effitor/index.ts'],
    entryPoints: ['temp/src/effitor/index.js'],
    bundle: true,
    outbase: 'src/effitor',
    // outdir: 'dist',
    outfile: 'dist/index.js',
    // minify: true,
    format: 'esm',
    // target: 'node16',
    platform: 'node',
    alias: {
        "@": "temp/src"
    }
});

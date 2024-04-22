// @ts-check

import esbuild from 'esbuild';
await esbuild.build({
    entryPoints: ['src/effitor/index.ts'],
    bundle: true,
    outbase: 'src/effitor',
    // outdir: 'dist',
    outfile: 'dist/index.js',
    // minify: true,
    format: 'esm',
    // target: 'node16',
    platform: 'node',
});

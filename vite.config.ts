import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite";

export default defineConfig(({ command, mode }) => {
    if (command === 'serve') {
        // dev
        return {
            resolve: {
                alias: {
                    '@': fileURLToPath(new URL('./src', import.meta.url))
                },
            },

        }
    }
    else {
        // build
        return {
            resolve: {
                alias: {
                    '@': fileURLToPath(new URL('./temp/src', import.meta.url))
                },
            },
            build: {
                minify: false,
                lib: {
                    entry: 'temp/src/effitor/index.js',
                    fileName: 'index',
                    formats: ['es'],
                },
            }
        }
    }
})
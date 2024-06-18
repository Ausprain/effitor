import { fileURLToPath, URL } from "url";
import { UserConfig } from "vite";
import { defineConfig } from "vite";

export default defineConfig(({ command, mode }) => {
    const baseConfig: UserConfig = {
        envDir: './src'
    }
    if (command === 'serve') {
        // dev
        return {
            ...baseConfig,
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
            ...baseConfig,
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
/// <reference types="vite/client" />
// https://cn.vitejs.dev/guide/env-and-mode#intellisense

interface ImportMetaEnv {
    // readonly VITE_APP_TITLE: string
    // 更多环境变量...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
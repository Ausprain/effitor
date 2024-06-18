/// <reference types="vite/client" />
// https://cn.vitejs.dev/guide/env-and-mode#intellisense

interface ImportMetaEnv {
    // readonly VITE_APP_TITLE: string
    readonly VITE_CMD_DEBUG: string
    readonly VITE_TRANX_DEBUG: string
    // 更多环境变量...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
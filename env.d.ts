interface ImportMeta {
  env: ImportMetaEnv
}

interface ImportMetaEnv {
  DEV: boolean
  VITE_CONTEXT_DEV?: boolean
}

// css 模块
declare module '*.css?raw' {
  const content: string
  export default content
}
declare module '*.css' {
  const src: string
  export default src
}

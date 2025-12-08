// tsup.config.ts
import fs from 'fs-extra'
import { resolve } from 'path'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/**/*.css'],
  format: ['esm'],
  outDir: 'dist',
  bundle: true,
  clean: true,
  minify: false,
  sourcemap: false,
  esbuildOptions(options) {
    options.loader = {
      ...options.loader,
      '.css': 'css',
    }
    options.entryNames = '[dir]/[name]'
    options.external = ['*.woff2', '*.woff', '*.ttf', '*.eot']
  },
  onSuccess: async () => {
    fs.copySync('./src/fonts', './dist/fonts')
    sumupThemesCss()
  },
})

const DIST_PATH = resolve(import.meta.dirname, 'dist')
const PACKAGES_PATH = resolve(import.meta.dirname, '..')
async function copyThemeCssFromPlugins() {
  const pkgDirList = await fs.readdir(PACKAGES_PATH)
  const createdPathMap = {} as Record<string, Promise<void>>

  await Promise.all(pkgDirList.filter(checkPkgName).map(tryCopyPluginThemes))

  function checkPkgName(pkgDir: string) {
    if (pkgDir.startsWith('assist-') || pkgDir.startsWith('plugin-')) {
      return true
    }
    return false
  }
  async function tryCopyPluginThemes(pkgDir: string) {
    const pluginThemesPath = resolve(PACKAGES_PATH, pkgDir, 'src', 'themes')
    if (!fs.existsSync(pluginThemesPath)) {
      return
    }
    const themeFileList = await fs.readdir(pluginThemesPath)
    return Promise.all(themeFileList.map(async (fileName) => {
      if (!fileName.endsWith('.css')) {
        return
      }
      const themeName = fileName.slice(0, -4)
      const destDirPath = resolve(DIST_PATH, 'themes', themeName)
      await ensureDestPath(destDirPath)
      fs.copySync(resolve(pluginThemesPath, fileName), resolve(destDirPath, `${pkgDir}.css`))
    }))
  }
  async function ensureDestPath(destPath: string) {
    if (createdPathMap[destPath]) {
      return await createdPathMap[destPath]
    }
    if (fs.existsSync(destPath)) {
      return destPath
    }
    createdPathMap[destPath] = fs.mkdirp(destPath)
    return await createdPathMap[destPath]
  }
}
function indexThemesCss() {
  fs.readdir(resolve(DIST_PATH, 'themes')).then((themeDirList) => {
    themeDirList.forEach(createIndexCss)
  })

  async function createIndexCss(themeDirName: string) {
    const cssNames = await fs.readdir(resolve(DIST_PATH, 'themes', themeDirName))
    const content = cssNames.map(name => `@import './${name}';`).join('\n')
    fs.writeFileSync(resolve(DIST_PATH, 'themes', themeDirName, `index.css`), content)
  }
}
async function sumupThemesCss() {
  await copyThemeCssFromPlugins()
  indexThemesCss()
}

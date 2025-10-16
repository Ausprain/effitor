import { exec } from 'child_process'
import fs from 'fs-extra'
import { resolve } from 'path'
import { styleText } from 'util'

import config from './config.js'

const TSUP_CONFIG_TS = `
import { defineConfig } from 'tsup'

import sharedConfig from '../../tsup.shared'

export default defineConfig({
  ...sharedConfig,
})
`.trimStart()
const TSCONFIG_BUILD_JSON = `
{
  "extends": "../../tsconfig.build.json",
  "include": ["./src", "../shared"]
}
`.trimStart()

const { PACKAGES_DIR_PATH, MAIN_PKG_DIR_PATH, OUTPUT_DIR } = config
const HELPER_DTS_PATH = resolve(PACKAGES_DIR_PATH, 'shared/helper.d.ts')

const copyHelperDts = (pkgDir) => {
  const distPath = resolve(pkgDir, OUTPUT_DIR)
  fs.copySync(HELPER_DTS_PATH, resolve(distPath, 'helper.d.ts'))
}

const logTsupResult = (stdout) => {
  if (stdout) {
    console.log(stdout)
  }
}

const tsupPkg = async (pkgDir, copyHelper = true) => {
  return new Promise((res, rej) => {
    exec(`cd ${pkgDir} && npx tsup`, (err, stdout, stderr) => {
      if (err) {
        rej(stderr)
        return
      }
      res(stdout)
    })
  }).then((stdout) => {
    if (copyHelper) {
      copyHelperDts(pkgDir)
    }
    logTsupResult(stdout)
  }).catch((err) => {
    console.log(styleText('red', `build error ${err}`))
    process.exit(1)
  })
}

const buildCore = async () => {
  await tsupPkg(resolve(PACKAGES_DIR_PATH, 'core'))
  console.log(styleText('cyan', `build core success\n`))
}

const buildMain = async () => {
  await tsupPkg(MAIN_PKG_DIR_PATH, false)
  console.log(styleText('cyan', `build main success\n`))
}

const buildElsePkgs = async () => {
  const files = await fs.readdir(PACKAGES_DIR_PATH)
  return Promise.all(files.map(async (file) => {
    if (file === 'core') {
      return
    }
    return tryToBuildSubPackage(file)
  }))
}

const tryToBuildSubPackage = async (pkgName) => {
  const pkgDir = resolve(PACKAGES_DIR_PATH, pkgName)
  const stats = await fs.stat(pkgDir)
  if (stats.isDirectory()) {
    const files = await fs.readdir(pkgDir)
    if (files.includes('package.json')) {
      if (!files.includes('tsup.config.ts')) {
        await fs.writeFile(resolve(pkgDir, 'tsup.config.ts'), TSUP_CONFIG_TS)
      }
      if (!files.includes('tsconfig.build.json')) {
        await fs.writeFile(resolve(pkgDir, 'tsconfig.build.json'), TSCONFIG_BUILD_JSON)
      }
      if (!files.includes('README.md')) {
        await fs.writeFile(resolve(pkgDir, 'README.md'), `# @effitor/${pkgName}`)
      }
      await tsupPkg(pkgDir)
      console.log(styleText('cyan', `build package ${pkgName} success\n`))
    }
  }
}

const build = async () => {
  console.log(styleText('cyan', `build start...`))
  await buildCore()
  await buildElsePkgs()
  await buildMain()
}

build().then(() => {
  console.log(styleText('green', 'build success\n'))
}).catch((err) => {
  console.log(styleText('red', `build error ${err}`))
})

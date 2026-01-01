import { exec } from 'child_process'
import fs from 'fs-extra'
import { basename, resolve } from 'path'
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

const { PACKAGES_DIR_PATH, MAIN_PKG_DIR_PATH, PROJECT_DIR_PATH } = config

const logTsupResult = (stdout) => {
  if (stdout) {
    console.log(stdout)
  }
}

const tsupPkg = async (pkgDir) => {
  return new Promise((res, rej) => {
    exec(`cd ${pkgDir} && npx tsup`, (err, stdout, stderr) => {
      if (err) {
        rej(stderr)
        return
      }
      res(stdout)
    })
  }).then((stdout) => {
    logTsupResult(stdout)
  }).catch((err) => {
    console.log(styleText('red', `build [${basename(pkgDir)}] error ${err}`))
    process.exit(1)
  })
}

const buildCore = async () => {
  await tsupPkg(resolve(PACKAGES_DIR_PATH, 'core'))
  console.log(styleText('cyan', `build core success\n`))
}

const buildThemes = async () => {
  await tsupPkg(resolve(PACKAGES_DIR_PATH, 'themes'), false)
  console.log(styleText('cyan', `build themes success\n`))
}

const buildMain = async () => {
  await tsupPkg(MAIN_PKG_DIR_PATH, false)
  await fs.copyFile(
    resolve(PROJECT_DIR_PATH, 'README.md'),
    resolve(MAIN_PKG_DIR_PATH, 'README.md'),
  )
  await fs.copyFile(
    resolve(PROJECT_DIR_PATH, 'README_zh.md'),
    resolve(MAIN_PKG_DIR_PATH, 'README_zh.md'),
  )

  console.log(styleText('cyan', `build main success\n`))
}

const buildElsePkgs = async () => {
  const pkgs = await fs.readdir(PACKAGES_DIR_PATH)
  const { assists, plugins } = pkgs.reduce((acc, pkgName) => {
    if (pkgName === 'core' || pkgName === 'themes') {
      return acc
    }
    if (pkgName.startsWith('assist-')) {
      acc.assists.push(pkgName)
    }
    else {
      acc.plugins.push(pkgName)
    }
    return acc
  }, { assists: [], plugins: [] })

  await Promise.all(assists.map(tryToBuildSubPackage))
  await Promise.all(plugins.map(tryToBuildSubPackage))
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
  await buildThemes()
  await buildElsePkgs()
  await buildMain()
}

build().then(() => {
  console.log(styleText('green', 'build success!!\n'))
}).catch((err) => {
  console.log(styleText('red', `build error ${err}`))
})

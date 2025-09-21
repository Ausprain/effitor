import { exec } from 'child_process'
import fs from 'fs-extra'
import { resolve } from 'path'
import { styleText } from 'util'

import config from './config.js'

const { packagesDirPath, mainPkgDirPath, outputDir } = config
const helperDtsPath = resolve(packagesDirPath, 'shared/helper.d.ts')

const copyHelperDts = (pkgDir) => {
  const distPath = resolve(pkgDir, outputDir)
  fs.copySync(helperDtsPath, resolve(distPath, 'helper.d.ts'))
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
  await tsupPkg(resolve(packagesDirPath, 'core'))
  console.log(styleText('cyan', `build core success\n`))
}

const buildMain = async () => {
  await tsupPkg(mainPkgDirPath, false)
  console.log(styleText('cyan', `build main success\n`))
}

const buildElsePkgs = async () => {
  const files = await fs.readdir(packagesDirPath)
  return Promise.all(files.map(async (file) => {
    if (file === 'core') {
      return
    }
    return tryToBuildSubPackage(file)
  }))
}

const tryToBuildSubPackage = async (pkgName) => {
  const pkgDir = resolve(packagesDirPath, pkgName)
  const stats = await fs.stat(pkgDir)
  if (stats.isDirectory()) {
    const files = await fs.readdir(pkgDir)
    if (files.includes('tsup.config.ts') && files.includes('package.json')) {
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

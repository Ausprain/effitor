import { exec } from 'child_process'
import fs from 'fs-extra'
import { resolve } from 'path'
import { styleText } from 'util'

const projectDir = resolve(import.meta.dirname, '../')
const packagesDir = resolve(projectDir, 'packages')
const mainPkgDir = resolve(projectDir, 'main')

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
  })
}

const buildCore = async () => {
  const corePkgDir = resolve(packagesDir, 'core')
  console.log(styleText('cyan', `build core ${corePkgDir}`))
  logTsupResult(await tsupPkg(corePkgDir))
}

const buildMain = async () => {
  console.log(styleText('cyan', `build main ${mainPkgDir}`))
  logTsupResult(await tsupPkg(mainPkgDir))
}

const buildElsePkgs = async () => {
  const files = await fs.readdir(packagesDir)
  files.forEach(async (file) => {
    if (file === 'core') {
      return
    }
    logTsupResult(await tryToBuildSubPackage(file))
  })
}

const tryToBuildSubPackage = async (pkgName) => {
  const pkgDir = resolve(packagesDir, pkgName)
  const stats = await fs.stat(pkgDir)
  if (stats.isDirectory()) {
    const files = await fs.readdir(pkgDir)
    if (files.includes('tsup.config.ts') && files.includes('package.json')) {
      console.log(styleText('cyan', `build package ${pkgName}`))
      return await tsupPkg(pkgDir)
    }
  }
}

const build = async () => {
  await buildCore()
  await buildElsePkgs()
  await buildMain()
}

build().then(() => {
  console.log(styleText('green', 'build success'))
}).catch((err) => {
  console.log(styleText('red', `build error ${err}`))
})

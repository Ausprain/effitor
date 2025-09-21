// @ts-check

import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import baseJson from '../package.json'
import config from './config.js'

const updateConfigs = ([
  'version',
  'description',
  'keywords',
  'author',
  'license',
  'homepage',
  'repository',
]// as (keyof typeof baseJson)[]
).reduce((config, key) => {
  config[key] = baseJson[key]
  return config
}, {})
const keyOrdered = {
  name: undefined,
  version: undefined,
  description: undefined,
  keywords: undefined,
  type: undefined,
  main: undefined,
  types: undefined,
  files: undefined,
  exports: undefined,
  author: undefined,
  license: undefined,
  homepage: undefined,
  repository: undefined,
  scripts: undefined,
  dependencies: undefined,
  devDependencies: undefined,
  peerDependencies: undefined,
}

const { mainPkgDirPath, packagesDirPath } = config

const pkgDirPaths = [mainPkgDirPath, ...(await fs.readdir(packagesDirPath)).map(name => resolve(packagesDirPath, name))]
const pkgJsonPaths = await Promise.all(pkgDirPaths.map(async (dir) => {
  return await fs.stat(resolve(dir, 'package.json')).then(
    stat => stat.isFile() ? resolve(dir, 'package.json') : '',
    () => '',
  )
})).then(paths => paths.filter(Boolean))
const packageJsonList = await Promise.all(pkgJsonPaths.map(async (path) => {
  return {
    path,
    json: (await import(path)).default,
  }
}))

packageJsonList.forEach(({ path, json }) => {
  fs.writeFile(
    resolve(path, '../package.json'),
    JSON.stringify({
      ...keyOrdered,
      ...json,
      ...updateConfigs,
    }, null, 2),
  )
})

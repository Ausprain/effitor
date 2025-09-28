// @ts-check

import fs from 'node:fs/promises'
import { dirname, resolve, join } from 'node:path'
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

const { REPOSITORY_URL, MAIN_PKG_DIR_PATH, PACKAGES_DIR_PATH, EXAMPLES_DIR_PATH } = config

const pkgDirPaths = [
  MAIN_PKG_DIR_PATH,
  ...(await fs.readdir(PACKAGES_DIR_PATH)).map(name => resolve(PACKAGES_DIR_PATH, name)),
  ...(await fs.readdir(EXAMPLES_DIR_PATH)).map(name => resolve(EXAMPLES_DIR_PATH, name)),
]
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
  let pkgName = dirname(path).split('/').at(-1)
  if (!pkgName) {
    return
  }
  let repositoryDir = undefined
  if (pkgName === 'main') {
    repositoryDir = 'main'
    pkgName = 'effitor'
  }
  else {
    repositoryDir = `packages/${pkgName}`
    pkgName = `@effitor/${pkgName}`
  }
  const pkgJson = {
    ...keyOrdered,
    ...json,
    ...updateConfigs,
    name: pkgName,
  }
  if (pkgJson.repository) {
    pkgJson.repository.type = 'git'
    pkgJson.repository.url = `git+${REPOSITORY_URL}`
    pkgJson.repository.directory = repositoryDir
    pkgJson.homepage = `${join(REPOSITORY_URL, repositoryDir)}#readme`
  }
  // 保留原有 description
  if (json.description) {
    pkgJson.description = json.description
  }
  fs.writeFile(
    resolve(path, '../package.json'),
    JSON.stringify(pkgJson, null, 2) + '\n',
  )
})

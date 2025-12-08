// @ts-check

import fs from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import baseJson from '../package.json'
import config from './config.js'

/**
 * get dirname in unix style
 * @param {string} path
 */
const unixdirname = path => dirname(path).replaceAll('\\', '/')

const updateConfigs = ([
  'version',
  'keywords',
  'author',
  'license',
  'repository',
]// as (keyof typeof baseJson)[]
).reduce((config, key) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  config[key] = baseJson[key]
  return config
}, {})
const keyOrdered = {
  name: undefined,
  version: undefined,
  description: undefined,
  private: undefined,
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
// 获取所有package.json路径
const pkgJsonPaths = await Promise.all(pkgDirPaths.map(async (dir) => {
  return await fs.stat(resolve(dir, 'package.json')).then(
    stat => stat.isFile() ? resolve(dir, 'package.json') : '',
    () => '',
  )
})).then(paths => paths.filter(Boolean))
// 读取所有package.json内容
const packageJsonList = await Promise.all(pkgJsonPaths.map(async (path) => {
  return {
    path,
    json: (await import(path)).default,
  }
}))
// 更新所有package.json
packageJsonList.forEach(({ path: jsonPath, json }) => {
  let pkgName = basename(dirname(jsonPath))
  if (!pkgName) {
    return
  }
  let repositoryDir = undefined
  if (pkgName === 'main') {
    repositoryDir = 'main'
    pkgName = 'effitor'
  }
  else {
    repositoryDir = unixdirname(jsonPath).split('/').slice(-2).join('/')
    // repositoryDir = `packages/${pkgName}`
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
  }
  // 保留原有 description
  if (json.description) {
    pkgJson.description = json.description
  }
  // scripts
  if (!pkgJson.scripts) {
    pkgJson.scripts = {}
  }
  if (!pkgJson.scripts.build) {
    pkgJson.scripts.build = 'tsup'
  }
  fs.writeFile(
    resolve(jsonPath, '../package.json'),
    JSON.stringify(pkgJson, null, 2) + '\n',
  )
})

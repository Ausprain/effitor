import { resolve } from 'path'

const projectDirPath = resolve(import.meta.dirname, '../')
export default {
  projectDirPath,
  packagesDirPath: resolve(projectDirPath, 'packages'),
  mainPkgDirPath: resolve(projectDirPath, 'main'),
  outputDir: 'dist',
}

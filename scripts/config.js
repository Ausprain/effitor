import { resolve } from 'path'

const projectDirPath = resolve(import.meta.dirname, '../')
export default {
  projectDirPath,
  mainPkgDirPath: resolve(projectDirPath, 'main'),
  packagesDirPath: resolve(projectDirPath, 'packages'),
  exampleDirPath: resolve(projectDirPath, 'examples'),
  outputDir: 'dist',
}

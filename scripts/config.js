import { resolve } from 'path'

const PROJECT_DIR_PATH = resolve(import.meta.dirname, '../')
export default {
  REPOSITORY_URL: 'https://github.com/Ausprain/effitor.git',
  PROJECT_DIR_PATH,
  HOME_PKG_DIR_PATH: resolve(PROJECT_DIR_PATH, 'home'),
  MAIN_PKG_DIR_PATH: resolve(PROJECT_DIR_PATH, 'main'),
  PACKAGES_DIR_PATH: resolve(PROJECT_DIR_PATH, 'packages'),
  EXAMPLES_DIR_PATH: resolve(PROJECT_DIR_PATH, 'examples'),
  OUTPUT_DIR: 'dist',
}

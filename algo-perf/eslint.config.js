import config from '../eslint.config.js'

/**
 * @type {import('eslint').Linter.Config[]}
 */
export default [
  ...config,
  {
    files: ['./**/*.{js,ts}'],
    rules: {
      'no-debugger': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
]

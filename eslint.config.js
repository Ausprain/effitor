import { defineConfig } from 'eslint/config'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'
import importPlugin from 'eslint-plugin-import'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import vitest from 'eslint-plugin-vitest'
import globals from 'globals'

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  stylistic.configs.recommended,
  // @stylistic
  {
    rules: {
      '@stylistic/max-len': ['error', {
        code: 120,
        comments: 120,
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      }],
    },
  },

  // typescript
  {
    files: ['./{example,packages,main}/**/*.ts'],
    // languageOptions: {
    //   parserOptions: {
    //     project: './tsconfig.json',
    //   },
    // },
    extends: [
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
    ],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    settings: {
      // resolve the problem `eslint(import/no-unresolved)` for `import ... from '@*'`
      // where path is defined in tsconfig.json.
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      'no-console': 'warn',

      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/no-cycle': 'error',
      // Make sure all imports are at the top of the file
      'import/first': 'error',
      // Make sure there's a newline after the imports
      'import/newline-after-import': 'error',
      // Merge imports of the same file
      'import/no-duplicates': 'error',
      // ignore `*.css?raw`
      'import/no-unresolved': ['error', { ignore: ['\\?raw$'] }],
      // 禁用此项, 因为函数类型无法对函数签名及返回值添加注释, 而接口类型中的函数前面可以
      '@typescript-eslint/prefer-function-type': 'off',
      // 有些函数重载类型声明合并在一起影响阅读和理解, 甚至类型推断, 如 `addEventListener`
      '@typescript-eslint/unified-signatures': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    ignores: ['**/dist/**', '**/out/**', '**/temp/**'],
  },

  // vitest
  {
    files: [
      '**/__tests__/**/*.{js,ts}',
      '**/*.test.ts',
    ],
    plugins: {
      vitest,
    },
    settings: {
      vitest: {
        typecheck: true,
      },
    },
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
      },
    },
    rules: {
      ...vitest.configs.recommended.rules,
      '@stylistic/max-len': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // scripts
  {
    files: ['./scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
)

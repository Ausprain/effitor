// @ts-check

/**
 * @type {import("stylelint").Config}
 */
export default {
  plugins: [
    '@stylistic/stylelint-plugin',
  ],
  rules: {
    // syntax rules from stylelint:
    'color-function-notation': 'modern',
    'selector-max-compound-selectors': 2,

    // stylistic rules from @stylistic/stylelint-plugin:
    '@stylistic/color-hex-case': 'lower',
    '@stylistic/number-leading-zero': 'always',
    '@stylistic/unit-case': 'lower',
    '@stylistic/indentation': 2,
  },
}

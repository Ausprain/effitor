export default {
  '*.{js,jsx,ts,tsx}': ['eslint --fix'],
  '*.{css,less,scss}': ['stylelint --fix'],
  '*.{html,json,md}': ['prettier --write'],
}

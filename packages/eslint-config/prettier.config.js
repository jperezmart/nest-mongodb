/** @type {import("prettier").Config} */
const config = {
  endOfLine: 'lf',
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  arrowParens: 'avoid',
  plugins: ['prettier-plugin-sort-json', 'prettier-plugin-packagejson'],
};

export default config;

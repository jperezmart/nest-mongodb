import base from '@jperezmart/eslint-config/base';

export default [
  ...base,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'eslint.config.js', 'tsdown.config.ts'],
  },
];

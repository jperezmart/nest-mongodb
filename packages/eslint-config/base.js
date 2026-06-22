import jsEslint from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import turboPlugin from 'eslint-plugin-turbo';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Shared ESLint flat config for Node/TypeScript packages in this monorepo.
 * Consumers spread this and override `parserOptions.tsconfigRootDir` with their
 * own `import.meta.dirname`.
 */
const config = defineConfig([
  jsEslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
      'simple-import-sort': simpleImportSort,
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      'import/no-extraneous-dependencies': ['error'],
    },
  },
  // Config files run by tooling are not part of the TS program; lint them
  // without type-aware rules.
  {
    files: ['**/*.config.{js,mjs,ts}', 'eslint.config.js'],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
      'import/no-extraneous-dependencies': 'off',
    },
  },
  eslintConfigPrettier,
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/.turbo/**'],
  },
]);

export default config;

import { baseConfig } from '@voyagr/eslint-config';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        __DEV__: 'readonly',
      },
    },
    rules: {
      // React Native specific rules go here
    },
  },
  {
    ignores: ['.expo/**', 'node_modules/**', 'dist/**'],
  },
];

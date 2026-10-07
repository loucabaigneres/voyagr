import { baseConfig } from '@voyagr/eslint-config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        __DEV__: 'readonly',
      },
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    languageOptions: { globals: globals.jest },
  },
  {
    files: ['*.config.js', 'babel.config.js', 'metro.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    ignores: ['.expo/**', 'node_modules/**', 'dist/**', 'nativewind-env.d.ts', 'expo-env.d.ts'],
  },
];

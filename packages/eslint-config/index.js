import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export const baseConfig = defineConfig([
  {
    // Target all JavaScript and TypeScript files
    files: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
  },

  {
    // Define the environment and global variables for Node.js
    languageOptions: { globals: globals.node },
  },

  // Include recommended rules from ESLint and TypeScript ESLint
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      // Allow console.warn and console.error, but disallow other console methods
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // Warn about the use of 'any' type in TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      // Warn about unused variables, but ignore those that start with an underscore
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },

  {
    ignores: ['node_modules/**', 'dist/**', '.turbo/**'],
  },

  // Include Prettier configuration to disable conflicting rules
  // This should always be last to ensure it overrides other configurations
  prettierConfig,
]);

import { baseConfig } from '@voyagr/eslint-config';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    // On ignore les dossiers des sous-projets car ils ont déjà
    // leur propre fichier eslint.config.js
    ignores: ['apps/**', 'packages/**', 'node_modules/**', 'dist/**', '.turbo/**'],
  },
];

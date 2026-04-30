import { baseConfig } from '@voyagr/eslint-config';

export default [
  ...baseConfig,
  {
    // On ignore les dossiers des sous-projets car ils ont déjà
    // leur propre fichier eslint.config.js
    ignores: ['apps/**', 'packages/**', 'node_modules/**', 'dist/**', '.turbo/**'],
  },
];

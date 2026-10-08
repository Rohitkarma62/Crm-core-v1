import js from '@eslint/js';
import react from 'eslint-plugin-react';

export default [
  {
    ignores: ['node_modules/**','android/**','ios/**','.expo/**'],
  },
  {
    files: ['**/*.js'],
    ...js.configs.recommended,
    plugins: { react },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        __DEV__: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none' }],
      'react/jsx-uses-vars': 'error',
    },
  },
];

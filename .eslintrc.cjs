/* eslint-env node */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: null,
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.json'],
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    },
  },
  rules: {
    // Imports
    'import/no-unresolved': 'error',
    'import/order': [
      'warn',
      {
        'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        'pathGroups': [
          { pattern: '@/types', group: 'internal', position: 'before' },
          { pattern: '@/**', group: 'internal', position: 'before' },
        ],
        'pathGroupsExcludedImportTypes': ['builtin'],
        'alphabetize': { order: 'asc', caseInsensitive: true },
        'newlines-between': 'always'
      }
    ],

    // TS
    '@typescript-eslint/no-explicit-any': 'off',

    // React Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    'scripts/',
  ],
};

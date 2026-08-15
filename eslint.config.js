import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Flat config. Three things this repo specifically needs from a linter:
 *
 *   1. jsx-a11y — the Library sidebar tree and the avatar <img>s have real
 *      accessibility gaps that no human review caught.
 *   2. Coverage of `src/utils/*.js` and `scripts/*.mjs`. `tsconfig.json` sets
 *      `checkJs: false`, so ~1,400 lines of the most fragile code (path
 *      resolution, remark AST surgery, recursive deletes) is invisible to
 *      `astro check`. ESLint is the only tool that sees it.
 *   3. react-hooks — the islands use effects with subscriptions
 *      (matchMedia listeners, pagefind init) where a missing cleanup is silent.
 *
 * Type-aware linting is deliberately NOT enabled: it would need a project
 * service covering .astro files, and `astro check` already does the type work.
 */
export default tseslint.config(
  {
    // Build output, vendored content, and the vault symlinks. src/content/*
    // are symlinks into the Obsidian vault — linting them would walk content
    // that this repo does not own.
    ignores: [
      'dist/**',
      '.astro/**',
      '.content/**',
      'node_modules/**',
      'public/pagefind/**',
      'src/content/people/**',
      'src/content/projects/**',
      'src/content/library/**',
      'fixtures/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,

  {
    files: ['**/*.{js,mjs,ts,tsx,astro}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // The `any`s in this repo are boundary types for untyped upstreams
      // (citation-js, pagefind, remark AST nodes). Flagging them as errors
      // would only invite suppression comments, and there are currently zero
      // suppressions in the codebase — worth keeping it that way.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Loaders legitimately leave a caught error unused when the recovery is
      // "skip this file and warn".
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  {
    files: ['**/*.tsx'],
    ...jsxA11y.flatConfigs.recommended,
    plugins: { ...jsxA11y.flatConfigs.recommended.plugins, 'react-hooks': reactHooks },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
    },
  },

  {
    // CLI tools: console output IS the interface.
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },

  {
    files: ['test/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
);

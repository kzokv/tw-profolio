// @ts-check
/**
 * ESLint flat config — single source of truth for the repo.
 *
 * STANDARD RULES (community best practices, adopt first):
 * - eslint.configs.recommended: core JS (no unused vars, no debugger, etc.)
 * - tseslint.configs.recommended: TypeScript recommended (no-explicit-any,
 *   no-floating-promises, etc.). typescript-eslint's recommended set already
 *   implies the "eslint-recommended" overrides that disable JS rules TS covers.
 *
 * CUSTOM RULES (project-specific, add only after standard set passes and team agrees):
 * - Naming: @typescript-eslint/naming-convention for handlers, components, constants
 * - Import boundaries: no-restricted-imports or plugin so apps/* don't import other apps
 * - Env/security: restrict process.env in libs or allowlist in app code
 * - Test overrides: relax in test dirs and *.test.ts / *.spec.ts files
 * - Document any rule turned off with a short comment
 *
 * PLAYWRIGHT: eslint-plugin-playwright recommended rules apply only to TS files under tests/e2e
 * (e.g. missing-playwright-await, no-focused-test, no-page-pause, expect-expect).
 */
import eslint from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/.turbo/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // Playwright recommended rules for e2e test files only
  {
    files: ['tests/e2e/**/*.ts'],
    ...playwright.configs['flat/recommended'],
  },
];

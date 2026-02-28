# E2E Tests

Playwright-based end-to-end tests for critical user journeys. Run against the web app and API (memory or postgres).

## Structure

- **`specs/`** – Test specs grouped by flow. One file per area (e.g. `critical-flows.spec.ts`). Use `test.describe()` for transaction, settings, recompute, tooltips.
- **`helpers/flows.ts`** – Shared flow helpers: `gotoApp(page)`, `openSettingsDrawer(page)` to avoid duplication and keep selectors in one place.
- **`playwright.config.ts`** – Starts API and web dev servers, `baseURL` to web app.
- **`run-playwright-if-supported.sh`** – Skips E2E when system lacks Playwright browser deps (e.g. libglib); use in CI where E2E is optional.

## Coverage (vs integration)

E2E covers **user-visible behavior** and full-stack flows. It does not re-test API contracts (those live in `apps/api/test/integration/`). See `docs/acceptance-test-mapping.md` for which acceptance criteria are covered by E2E vs integration.

## Playwright environment (project-level only)

Playwright is installed as a **project devDependency** (root and `tests/e2e`). Do not rely on a global install.

- **Install browsers** (once per machine / after clone): from repo root run `npm run playwright:install`.
- **Linux system deps** (if Chromium fails): from repo root run `npm run playwright:install-deps` (may need `sudo`).
- All Playwright commands should be run via `npx` or npm scripts so the project’s version is used.

## Running

From repo root:

- `npm run test:e2e` – runs E2E (or skips if unsupported).
- `npm run test:e2e:ci` – runs Playwright directly (e.g. in CI with deps installed).
- `npm run playwright:install` – install Playwright browser binaries.

Selectors use `data-testid` for stability; avoid layout- or text-dependent selectors where possible.

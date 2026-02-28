# E2E Tests

Playwright-based end-to-end tests for critical user journeys. Run against the web app and API (memory or postgres).

## Why E2E lives under `apps/web`

E2E tests are owned by the web app and run against the full stack (web + API). Colocating them under `apps/web/tests/e2e/` keeps tests with the app they exercise and simplifies the monorepo layout.

## Structure

- **`specs/`** – Test specs grouped by flow. One file per area (e.g. `critical-flows.spec.ts`). Use `test.describe()` for transaction, settings, recompute, tooltips.
- **`helpers/flows.ts`** – Shared flow helpers: `gotoApp(page[, path])`, `appUrl(path)`, `openSettingsDrawer(page)` to avoid duplication and keep selectors in one place.
- **`playwright.config.ts`** – Configures Playwright to start API and web via `webServer` (runs `npm run dev -w apps/api` and `npm run dev -w apps/web` from repo root), with `baseURL` pointing to the web app.

## Requirements

- **Playwright**: Installed as project devDependency (root and `apps/web`). Run `npm run onboard` or `npm run install:full` from repo root once per machine.
- **System libs** (Linux): If Chromium fails with missing shared libraries (e.g. `libglib-2.0.so.0`), run `npx playwright install-deps` (may need `sudo`). E2E requires Playwright system dependencies; failures may indicate missing libraries.
- **Ports**: `WEB_PORT` (default `3333`) and `API_PORT` (default `4000`) must be free. Set env vars to override.
- **Build**: Ensure libs and apps are built before running E2E (or run `npm run build` from repo root).

## Coverage (vs integration)

E2E covers **user-visible behavior** and full-stack flows. It does not re-test API contracts (those live in `apps/api/test/integration/`). See `docs/acceptance-test-mapping.md` for which acceptance criteria are covered by E2E vs integration.

## Running

From **repo root** (scripts live in root package.json):

- `npm run test:e2e` – Runs Playwright with config at `apps/web/tests/e2e/`. `webServer` starts API and web automatically. Generates an HTML report; opens automatically on failure.
- `npm run test:e2e:ci` – Same, with `--reporter=junit` for CI integration.
- `npm run test:e2e:show-report` – View the last generated HTML report (run from repo root or `apps/web`).
- `npm run install:full` – Install npm deps + Playwright browsers + system deps (Linux; prompts for sudo if needed).

## HTML report

An HTML report is generated on every E2E run and saved to `apps/web/playwright-report/`. It opens automatically when tests fail. To view it manually, run `npm run test:e2e:show-report` from repo root or `apps/web`.

Selectors use `data-testid` for stability; avoid layout- or text-dependent selectors where possible.

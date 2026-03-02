# Taiwan Portfolio Monorepo

MVP monorepo for Taiwan stock/ETF portfolio tracking with configurable fee/tax rules and FIFO/LIFO lot matching.

## Structure

- `apps/web`: Next.js UI
- `apps/api`: Fastify API
- `libs/domain`: fee/tax/cost-basis engines
- `libs/shared-types`: shared API/domain types
- `apps/web/tests/e2e`: Playwright critical journey tests (owned by web app; run against full stack)

## Ports

All ports are configurable via env vars:

- `WEB_PORT` (default `3000`)
- `API_PORT` (default `4000`)
- `DB_PORT` (default `5432`)
- `REDIS_PORT` (default `6379`)

## Run

**Quick setup:** From repo root run `npm run onboard` (installs deps, builds the workspace libs, installs Playwright browsers/system deps, creates `.env` from `.env.example` if missing, and runs lint). Or use `npm run install:full` for install only (npm + Playwright + system deps). Then start infra and dev as below.

1. Copy `.env.example` to `.env` (or use `npm run onboard` to do this automatically).
2. Install dependencies: `npm run install:full` or `npm install`
   - Onboarding already builds `@tw-portfolio/domain` and `@tw-portfolio/shared-types`. If you install dependencies without running `npm run onboard`, or if you edit either lib, rerun `npm run build -w libs/domain -w libs/shared-types` before starting the dev servers.
3. Start infra: `docker compose -f infra/docker/docker-compose.yml up -d`
4. Start API and web: `npm run dev`. `npm run dev` and the onboarding flow already build the workspace libs when needed, but rerun `npm run build -w libs/domain -w libs/shared-types` after editing those packages or if you skipped onboarding.

## Test

- Unit: `npm run test:unit`
- Integration: `npm run test:integration`
- E2E: `npm run test:e2e`
- API test reports (HTML / JSON / JUnit): see [apps/api/README.md](apps/api/README.md#testing-vitest).

## Web UI behavior

- Locale is user-configurable (`en`, `zh-TW`) from the avatar settings drawer.
- Saving locale to `zh-TW` translates the full web UI to Traditional Chinese.
- Settings drawer now has two tabs: `General` and `Fee Profiles`.
- Fee profile configuration is managed in the settings drawer (not on the dashboard).
- Users can maintain multiple fee profiles with auto-generated profile IDs (UUID).
- Account-level fallback profile + per-security override bindings are configurable in settings.
- Recompute uses per-security override first, then account fallback profile after confirmation.
- Drawer warns before closing with unsaved edits and supports explicit `Discard Changes`.
- Key terms expose contextual tooltips, including detailed FIFO/LIFO guidance.

## API security defaults

- CORS allowlist is controlled by `ALLOWED_ORIGINS`.
- Mutation routes are protected by in-process rate limiting:
  - `RATE_LIMIT_WINDOW_MS`
  - `RATE_LIMIT_MAX_MUTATIONS`
- API validates request payloads with strict runtime schemas.
- Persistence blocks cross-tenant ID takeover on upsert for accounts/fee profiles.

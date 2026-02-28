# Deployment Guide

This document is the single source of truth for deploying and operating the **tw-portfolio** stack: local development, production on the QNAP home lab, and related runbooks. It is written for operators and developers who deploy or troubleshoot the stack.

---

## 1. Prerequisites

- **Docker** and **Docker Compose** on the deployment host
- **Git** (for production: repo cloned on the deploy host)
- **Production**: Configured env file at `infra/docker/.env.prod` (see First-time setup)
- **Production**: Clean git working tree for deploy (or use `--force`; see Deploy script options)

---

## 2. Local Development

### Start services

- Infra: `docker compose -f infra/docker/docker-compose.yml up -d`
- API: `npm run dev -w apps/api`
- Web: `npm run dev -w apps/web`

### Build model

- Workspace libraries (`@tw-portfolio/domain`, `@tw-portfolio/shared-types`) are **not** built during `npm install` / `npm ci`. Builds happen only via explicit commands.
- Local: `npm run dev` (from repo root) starts the API and web dev servers. **Build libs first** if not yet built: `npm run build -w libs/domain -w libs/shared-types` (or `npm run build` for full build).
- CI: `npm ci` then explicit `npm run build -w ...` steps for domain/shared-types/api (and web typecheck).
- Production: Dockerfiles run `npm ci` then explicit `npm run build -w ...` in the same order; deploy builds images from the checked-out ref.

### Required env

- `WEB_PORT`, `API_PORT`, `DB_PORT`, `REDIS_PORT`
- `AUTH_MODE`, `PERSISTENCE_BACKEND`
- `DB_URL`, `REDIS_URL` (optional overrides)
- `ALLOWED_ORIGINS` (comma-separated CORS allowlist)
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_MUTATIONS`

### Notes

- Use `AUTH_MODE=dev_bypass` for local development only.
- For production-like runs use `AUTH_MODE=oauth`. With `AUTH_MODE=oauth`, the API expects the header `x-authenticated-user-id`. The web app sends it when `NEXT_PUBLIC_AUTH_USER_ID` is set (production: set `AUTH_USER_ID` in `infra/docker/.env.prod`; it is passed as a build arg, so the web image must be rebuilt after changing it). If `AUTH_USER_ID` is blank with `AUTH_MODE=oauth`, the web app sends no auth header and calls like `GET /settings` return 401.
- With `AUTH_USER_ID` / `NEXT_PUBLIC_AUTH_USER_ID`, the user id is embedded in the client bundle and is visible to anyone who can load the web app. This is acceptable for the intended single-user home-lab deployment; do not reuse for multi-tenant or untrusted-user environments.
- Recompute history is explicit and audited via preview/confirm APIs.
- For local tests without DB/Redis, set `PERSISTENCE_BACKEND=memory`.

### E2E tests (local)

- **Run**: From repo root, `npm run test:e2e` (or `npm run test:e2e:ci` for JUnit output).
- **Setup**: Install Playwright browsers once: `npm run playwright:install`. On Linux, if Chromium fails, run `npm run playwright:install-deps` (may need `sudo`).
- **Ports**: E2E uses `WEB_PORT` (default `3333`) and `API_PORT` (default `4000`). Ensure these ports are free or set env vars to avoid conflicts with other services.
- **Servers**: Playwright's `webServer` starts API and web automatically; no separate server script needed. Uses `PERSISTENCE_BACKEND=memory` and `AUTH_MODE=dev_bypass`.

---

## 3. Production Deployment (QNAP Home Lab)

### 3.1 Architecture

- **QNAP**: `192.168.2.10` (QTS 5.2.8, x86_64)
- **Deployment orchestrator**: `ubuntu-sshd` container at `192.168.2.61`
- **App network**: Docker bridge `twp-prod-net`
- **External access**: Cloudflare Tunnel
  - Web: `https://twp-web.kzokvdevs.dpdns.org`
  - API: `https://twp-api.kzokvdevs.dpdns.org`

### 3.2 Host resource budget

The QNAP NAS provides compute. Container limits are set to stay within host capacity with headroom for OS and QTS.

| Resource | Container limits total | Host available (est.) | Headroom        |
|----------|------------------------|------------------------|-----------------|
| Memory   | ~1,920 MB              | 8 GB                   | ~6 GB for OS/QTS |
| vCPUs    | 3.75                   | 4 cores                | ~0.25 for OS    |

If the host has less than 8 GB RAM, reduce per-container limits in `infra/docker/docker-compose.prod.yml` to avoid OOM kills.

### 3.3 Containers

| Container              | Image                          | Port  |
|------------------------|--------------------------------|-------|
| `twp-prod-web`         | `twp-prod-web:<IMAGE_TAG>`     | 3000  |
| `twp-prod-api`         | `twp-prod-api:<IMAGE_TAG>`     | 4000  |
| `twp-prod-migrate`     | `twp-prod-migrate:<IMAGE_TAG>` | (run once) |
| `twp-prod-postgres`    | `postgres:16`                  | 5432  |
| `twp-prod-redis`       | `redis:7`                      | 6379  |
| `twp-prod-cloudflared` | `cloudflare/cloudflared`       | —     |

`IMAGE_TAG` is set by the deploy script (see Deploy script options). Postgres, Redis, and cloudflared use fixed upstream images.

---

## 4. First-time setup

1. **Clone the repo** on the QNAP (e.g. inside the `ubuntu-sshd` data mount):
   ```bash
   cd ~ && git clone <repo-url> tw-portfolio
   ```

2. **Create the production env file**:
   ```bash
   cp infra/docker/.env.prod.example infra/docker/.env.prod
   # Edit .env.prod with real passwords, tunnel token, and AUTH_USER_ID (required for AUTH_MODE=oauth)
   chmod 600 infra/docker/.env.prod
   ```
   With `AUTH_MODE=oauth`, set `AUTH_USER_ID` to a stable user id (e.g. `user-1` or your email). The web app sends it as `x-authenticated-user-id` on every API request so endpoints like `GET /settings` succeed instead of returning 401.

3. **Configure the Cloudflare Tunnel** in the Cloudflare Zero Trust dashboard (see `infra/cloudflared/README.md`). **Add both public hostnames** (web and API); otherwise the browser cannot resolve the API hostname.

4. **Deploy**:
   ```bash
   cd ~/tw-portfolio
   bash infra/scripts/deploy.sh
   ```

---

## 5. Normal deploy flow

Deploys use `infra/scripts/deploy.sh` with `infra/docker/docker-compose.prod.yml` and `infra/docker/.env.prod`. The script: checks out the target ref, builds app images, takes a pre-migration DB backup, runs migrations, brings up services, runs health checks, and on failure performs an automatic rollback.

### 5.1 Automated deploy (CI)

On push to `main`, GitHub Actions:

1. Runs lint, type-check, unit tests, and integration tests
2. SSHs into the deploy host via the Cloudflare tunnel
3. Runs `infra/scripts/deploy.sh $DEPLOY_SHA` (with the workflow head SHA)

The exact CI-tested commit is deployed; the image tag is the short SHA of that commit unless overridden (see `--image-tag` below).

### 5.2 Manual deploy

```bash
ssh ubuntu@192.168.2.61
cd ~/tw-portfolio
bash infra/scripts/deploy.sh
```

To deploy a specific CI-tested commit:

```bash
bash infra/scripts/deploy.sh <commit-sha>
```

### 5.3 Deploy script reference

**Usage:** `infra/scripts/deploy.sh [OPTIONS] [DEPLOY_SHA]`

| Option / argument | Description |
|-------------------|-------------|
| `-h`, `--help` | Show help and exit |
| `-b`, `--branch BRANCH` | Deploy from this branch (default: `main`) |
| `-s`, `--select-branch` | Interactively choose deploy branch from `git branch -a` (requires a TTY) |
| `-t`, `--image-tag TAG` | Use **TAG** for all app images (`twp-prod-api`, `twp-prod-web`, `twp-prod-migrate`). If omitted, the tag is the **short commit SHA** of the deployed ref (e.g. `a1b2c3d`). |
| `-f`, `--force` | Allow deploy with uncommitted changes (use with care; uncommitted changes may be lost on checkout) |
| `DEPLOY_SHA` | Optional. Commit SHA to deploy; must be reachable from the target branch. If omitted, script pulls latest from the branch. |

**Image tag behavior**

- **Default (no `--image-tag`)**: After checkout, the script sets `IMAGE_TAG=$(git rev-parse --short HEAD)`. All three app images are built and tagged with this value, so the same tag is used consistently for api, web, and migrate.
- **With `--image-tag TAG`**: The script uses **TAG** as `IMAGE_TAG` for the same three images. Use this when you need a specific tag (e.g. version label or a known-good tag for a rollback where you still want to build from the current checkout but label images explicitly).
- **Constraint**: The script always **builds** from the current checkout; it does not pull pre-built images by tag. For a rollback to an old commit, use `deploy.sh <commit-sha>` so the tag becomes that commit’s short SHA, or use `--image-tag` only when you want a different tag string for the images built in this run.

**Requirements**

- Docker and docker compose on PATH
- `infra/docker/.env.prod` present and configured
- Clean git working tree unless `--force` is used

**Exit codes:** `0` = success; `1` = validation or deployment failure (including after rollback).

---

## 6. Health checks

- **Liveness**: `GET /health/live` → `{ "status": "ok" }`
- **Readiness**: `GET /health/ready` → `{ "status": "ready", "dependencies": { "postgres": true, "redis": true } }`

The deploy script waits up to 30s for the API and 20s for the web; if either fails, it triggers rollback.

---

## 7. Deploy logs and container logs

### Deploy logs

Each run writes a timestamped log and container snapshots under the state directory:

```
~/.local/state/tw-portfolio/logs/deploy/
  deploy_YYYYMMDD_HHMMSS.log              # full deploy stdout+stderr
  deploy_YYYYMMDD_HHMMSS_containers/      # per-container log snapshots
    twp-prod-api.log
    twp-prod-web.log
    twp-prod-postgres.log
    ...
```

Logs older than 30 days are pruned automatically. Override the directory with `DEPLOY_LOG_DIR`, or set `TWP_STATE_DIR` as the base for both logs and backups.

### Checking container logs

```bash
docker logs twp-prod-api --tail 100 -f
docker logs twp-prod-web --tail 100 -f
docker logs twp-prod-postgres --tail 50
docker logs twp-prod-redis --tail 50
docker logs twp-prod-cloudflared --tail 50
```

---

## 8. Troubleshooting

### 8.1 API requests fail with `net::ERR_NAME_NOT_RESOLVED` (e.g. `/settings`, `/portfolio/holdings`)

The browser cannot resolve the API hostname (`twp-api.kzokvdevs.dpdns.org`). This is a **DNS / Cloudflare Tunnel** configuration issue, not an app bug.

1. **Confirm both tunnel hostnames**  
   In **Cloudflare Zero Trust** → **Networks** → **Tunnels** → your tunnel → **Public Hostname**:
   - `twp-web.kzokvdevs.dpdns.org` → `http://twp-prod-web:3000`
   - `twp-api.kzokvdevs.dpdns.org` → `http://twp-prod-api:4000`  
   If the API hostname is missing, add it (same tunnel). Cloudflare will create the CNAME for the API subdomain.

2. **Verify DNS from the same network as users**  
   From a machine using the same DNS as the browser (e.g. your laptop):
   ```bash
   getent hosts twp-api.kzokvdevs.dpdns.org
   # or: nslookup twp-api.kzokvdevs.dpdns.org
   ```
   If it does not resolve, fix in step 1 and allow TTL/propagation.

3. **Ensure the zone is on Cloudflare**  
   The domain (e.g. `kzokvdevs.dpdns.org`) must be in Cloudflare so the tunnel can create CNAMEs. If DNS for that zone is elsewhere, create a CNAME for `twp-api.kzokvdevs.dpdns.org` pointing to your tunnel’s address (e.g. `<tunnel-id>.cfargotunnel.com`), as shown in the tunnel’s Public Hostname list.

After fixing DNS, no redeploy is needed; the web app already uses the correct API URL.

### 8.2 API requests show Response status 0 (CORS)

If the request to `twp-api...` shows **status 0** in DevTools and the page origin is `twp-web...`, the browser is likely blocking the response due to CORS (missing or wrong `Access-Control-Allow-Origin`).

1. **Check the API’s allowed origin** on the server:
   ```bash
   docker exec twp-prod-api printenv ALLOWED_ORIGINS
   ```
   It must be exactly `https://twp-web.kzokvdevs.dpdns.org` (no trailing slash). It is set from `PUBLIC_DOMAIN_WEB` in `docker-compose.prod.yml` via `ALLOWED_ORIGINS: https://${PUBLIC_DOMAIN_WEB:-...}`.

2. **Ensure `.env.prod` has** `PUBLIC_DOMAIN_WEB=twp-web.kzokvdevs.dpdns.org` (no trailing slash), then redeploy so the API container gets the correct env.

3. **Browser console**: Look for a CORS error (e.g. “blocked by CORS policy: No 'Access-Control-Allow-Origin' header”).

4. **Quick test**: Open `https://twp-api.kzokvdevs.dpdns.org/health/live` in a new tab. If it returns JSON, the API and DNS are fine and the issue is CORS for the web origin.

---

## 9. Rollback

### 9.1 Automatic rollback

If the API or web health check fails after deploy, the script automatically rolls back: it restores the previous git branch and SHA, restores the pre-migration database backup, rebuilds images, and restarts containers. The rollback block uses `set +e` so partial failures do not abort the recovery.

### 9.2 Manual rollback

To redeploy a known-good commit:

```bash
cd ~/tw-portfolio
git log --oneline -5          # find the commit to roll back to
bash infra/scripts/deploy.sh <commit-sha>
```

The script will checkout that SHA (if reachable from the current branch), use its short SHA as the image tag, and run the full deploy flow. To use a specific tag string for the images instead of the short SHA, pass `--image-tag <tag>` (the repo is still checked out and built from the current ref; only the tag label changes).

**Edge case**: Manual rollback does not re-run migrations in reverse. If the failed deploy applied a migration, the automatic rollback restores the DB from the pre-migration backup. If automatic restore failed, restore manually from backups (see Database backup and Migration rollback below).

### 9.3 Database migration rollback

Migrations are **not** automatically reversed by a code rollback. The deploy script takes a Postgres backup before every migration and restores it during automatic rollback. If automatic restore fails, restore manually from the state backup directory:

```bash
gunzip -c ~/.local/state/tw-portfolio/backups/<latest>.sql.gz | docker exec -i twp-prod-postgres psql -U twp -d tw_portfolio
```

Replace `<latest>` with the appropriate backup filename (e.g. the pre-migration backup).

### 9.4 Migration runner and contract

Migrations run in a dedicated image (`db/Dockerfile.migrate`) that bakes SQL files in at build time. The runner (`infra/scripts/run-migrations.sh`) applies files in sorted order with `ON_ERROR_STOP=1` and stops on first failure. All `.sql` files in `db/migrations/` must be idempotent (use `IF NOT EXISTS` / `IF EXISTS` guards). Non-idempotent schema changes require a versioned migration runner (tracked in backlog).

---

## 10. Database backup

**Script (recommended):**

```bash
bash infra/scripts/backup-postgres.sh
```

Backups are written to `~/.local/state/tw-portfolio/backups/` (or `BACKUP_DIR` / `TWP_STATE_DIR` if set). Old backups are pruned per `RETAIN_DAYS` (default 30).

**Manual backup:**

```bash
docker exec twp-prod-postgres pg_dump -U twp tw_portfolio | gzip > ~/.local/state/tw-portfolio/backups/tw_portfolio_$(date +%Y%m%d_%H%M%S).sql.gz
```

---

## 11. Expected downtime

Container recreation causes about **10–30 seconds** of downtime while `docker compose up -d` recreates changed containers and the Cloudflare Tunnel re-establishes. This is acceptable for the home-lab deployment.

---

## 12. Security assumptions

- **External TLS**: All public traffic is encrypted via the Cloudflare Tunnel. TLS terminates at Cloudflare’s edge; the tunnel uses an authenticated, encrypted connection to the `cloudflared` container.
- **Internal traffic**: Communication between containers on the `twp-prod-net` Docker bridge (web → api, api → postgres, api → redis) uses plaintext. This is acceptable because the bridge is isolated to the Docker host and not routable from the LAN.
- **Postgres**: No `sslmode`; relies on Docker network isolation.
- **Redis**: Password-authenticated, no TLS; relies on Docker network isolation.
- If the deployment moves to a multi-host setup, internal TLS must be introduced.

---

## 13. App behavior (reference)

The following sections describe product behavior for support and verification. They are not part of the deployment procedure.

### 13.1 Page-load progress bar

- The thin bar at the very top during **initial page load** is a frontend-only visual indicator.
- It is rendered by the web app’s root layout (`apps/web/app/layout.tsx`) via `LoadingProgressBar` (`apps/web/components/ui/LoadingProgressBar.tsx`) and styled in `apps/web/app/globals.css` (`.loading-progress`, `.loading-progress__bar`).
- The bar shows briefly on first load with a minimum visible duration, advances quickly then creeps toward ~80% on slower loads, and jumps to 100% and hides when the frontend considers the page ready. It does **not** track client-side route transitions.
- Accessibility: respects `prefers-reduced-motion`; uses `aria-live="off"` to avoid spamming screen readers.
- **Operational note**: This bar reflects perceived performance, not backend health; use `/health/live` and `/health/ready` for service status. If the bar is missing or wrong, verify the web container serves the expected layout, `globals.css` (including `.loading-progress` and theme tokens) is loaded, and no overlay is masking the bar (it uses `z-index: 1000`).

### 13.2 Settings drawer

- Open settings from the top-right avatar. Drawer URL state is `/?drawer=settings` for direct linking.
- Tabs: **General** and **Fee Profiles**. **Save Settings** persists locale, cost basis, poll interval, and fee profiles atomically via `/settings/full`. Fee profiles support account fallback and per-security overrides; new profile IDs are system-generated (UUID). **Discard Changes** reverts unsaved edits without closing the drawer. Closing with unsaved edits shows a warning.

### 13.3 Localization

- UI locales: `en` and `zh-TW`. After saving locale, visible wording (including settings tabs and dialogs) switches to the selected language. If language appears stale, reopen the settings drawer or reload and verify the `/settings` response.

### 13.4 Tooltips

- Settings terms and key financial terms on the dashboard/forms have hover/focus tooltips. FIFO/LIFO include detailed explanatory content in settings. Tooltips are keyboard-accessible via the info icon triggers.

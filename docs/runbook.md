# Runbook

## Local Development

### Start services

- Infra: `docker compose -f infra/docker/docker-compose.yml up -d`
- API: `npm run dev -w apps/api`
- Web: `npm run dev -w apps/web`

### Required env

- `WEB_PORT`
- `API_PORT`
- `DB_PORT`
- `REDIS_PORT`
- `AUTH_MODE`
- `PERSISTENCE_BACKEND`
- `DB_URL` (optional override)
- `REDIS_URL` (optional override)
- `ALLOWED_ORIGINS` (comma-separated CORS allowlist)
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_MUTATIONS`

### Notes

- Use `AUTH_MODE=dev_bypass` for local development only.
- In production-like environments, use `AUTH_MODE=oauth`. When `AUTH_MODE=oauth`, the API requires the request header `x-authenticated-user-id`. The web app sends it when `NEXT_PUBLIC_AUTH_USER_ID` is set (production: set `AUTH_USER_ID` in `infra/docker/.env.prod`; it is passed as a build arg so the web image must be rebuilt after changing it). If `AUTH_USER_ID` is left blank while `AUTH_MODE=oauth`, the web app will send no auth header and API calls like `GET /settings` will return 401.
- When using `AUTH_USER_ID` / `NEXT_PUBLIC_AUTH_USER_ID`, the user id is embedded into the client bundle and is visible to anyone who can load the web app. This is acceptable for the intended single-user home-lab deployment; do not reuse this pattern for multi-tenant or untrusted-user environments.
- Recompute history is explicit and audited through preview/confirm APIs.
- For local tests without DB/Redis, set `PERSISTENCE_BACKEND=memory`.

## Production Deployment (QNAP Home Lab)

### Architecture

- **QNAP**: `192.168.2.10` (QTS 5.2.8, x86_64)
- **Deployment orchestrator**: `ubuntu-sshd` container at `192.168.2.61`
- **App network**: Docker bridge `twp-prod-net`
- **External access**: Cloudflare Tunnel
  - Web: `https://twp-web.kzokvdevs.dpdns.org`
  - API: `https://twp-api.kzokvdevs.dpdns.org`

### Host Resource Budget

The QNAP NAS provides the underlying compute. Container resource limits are set to
stay within the host's capacity with headroom for the OS and QTS services.

| Resource | Container Limits Total | Host Available (est.) | Headroom |
|----------|----------------------|----------------------|----------|
| Memory   | ~1,920 MB            | 8 GB                 | ~6 GB for OS/QTS |
| vCPUs    | 3.75                 | 4 cores              | ~0.25 for OS |

If the host has less than 8 GB RAM, reduce the per-container limits in
`docker-compose.prod.yml` accordingly to avoid OOM kills.

### Containers

| Container           | Image                        | Port  |
|---------------------|------------------------------|-------|
| `twp-prod-web`       | `twp-prod-web:latest`         | 3000  |
| `twp-prod-api`       | `twp-prod-api:latest`         | 4000  |
| `twp-prod-postgres`  | `postgres:16`                | 5432  |
| `twp-prod-redis`     | `redis:7`                    | 6379  |
| `twp-prod-cloudflared` | `cloudflare/cloudflared`   | --    |

### First-time setup

1. Clone the repo on the QNAP (inside `ubuntu-sshd` data mount):
   ```bash
   cd ~ && git clone <repo-url> tw-portfolio
   ```

2. Create the production env file:
   ```bash
   cp infra/docker/.env.prod.example infra/docker/.env.prod
   # Edit .env.prod with real passwords, tunnel token, and AUTH_USER_ID (required for AUTH_MODE=oauth)
   chmod 600 infra/docker/.env.prod
   ```
   With `AUTH_MODE=oauth`, set `AUTH_USER_ID` to a stable user id (e.g. `user-1` or your email). The web app sends it as `x-authenticated-user-id` on every API request so endpoints like `GET /settings` succeed instead of returning 401.

3. Configure cloudflared tunnel in the Cloudflare Zero Trust dashboard
   (see `infra/cloudflared/README.md`). **You must add both public hostnames**
   (web and API); otherwise the browser cannot resolve the API hostname.

4. Deploy:
   ```bash
   bash infra/scripts/deploy.sh
   ```

### Subsequent deploys

Automated via GitHub Actions on push to `main`. The pipeline:
1. Runs lint, type-check, unit tests, integration tests
2. SSHs into `ubuntu-sshd` via cloudflared tunnel
3. Executes `infra/scripts/deploy.sh` (git pull, migrate, build, up)

Manual deploy:
```bash
ssh ubuntu@192.168.2.61
cd ~/tw-portfolio
bash infra/scripts/deploy.sh
```

### Health checks

- **Liveness**: `GET /health/live` -> `{ "status": "ok" }`
- **Readiness**: `GET /health/ready` -> `{ "status": "ready", "dependencies": { "postgres": true, "redis": true } }`

### Deploy logs

Each deploy writes a timestamped log and collects container snapshots:
```
~/.local/state/tw-portfolio/logs/deploy/
  deploy_20260227_143022.log                  # full deploy stdout+stderr
  deploy_20260227_143022_containers/          # per-container log snapshots
    twp-prod-api.log
    twp-prod-web.log
    twp-prod-postgres.log
    ...
```
Logs older than 30 days are pruned automatically. Override the directory with
`DEPLOY_LOG_DIR` or set `TWP_STATE_DIR` as the base directory.

### Checking container logs

```bash
docker logs twp-prod-api --tail 100 -f
docker logs twp-prod-web --tail 100 -f
docker logs twp-prod-postgres --tail 50
docker logs twp-prod-redis --tail 50
docker logs twp-prod-cloudflared --tail 50
```

### API requests fail with `net::ERR_NAME_NOT_RESOLVED` (e.g. `/settings`, `/portfolio/holdings`)

The browser cannot resolve the API hostname (`twp-api.kzokvdevs.dpdns.org`) to an IP.
This is a **DNS / Cloudflare Tunnel configuration** issue, not an app bug.

1. **Confirm both tunnel hostnames exist**  
   In **Cloudflare Zero Trust** → **Networks** → **Tunnels** → your tunnel → **Public Hostname**:
   - `twp-web.kzokvdevs.dpdns.org` → `http://twp-prod-web:3000`
   - `twp-api.kzokvdevs.dpdns.org` → `http://twp-prod-api:4000`  
   If the API hostname is missing, add it (same tunnel). Cloudflare will create the CNAME for the API subdomain.

2. **Verify DNS from the same network as users**  
   From a machine that uses the same DNS as the browser (e.g. your laptop):
   ```bash
   getent hosts twp-api.kzokvdevs.dpdns.org
   # or: nslookup twp-api.kzokvdevs.dpdns.org
   ```
   If it does not resolve, the record is missing or not yet propagated; fix in step 1 and allow TTL/propagation.

3. **Ensure the zone is on Cloudflare**  
   The domain `kzokvdevs.dpdns.org` (or the zone that contains it) must be added to Cloudflare so the tunnel can create CNAMEs. If DNS for that zone is elsewhere, you must create a CNAME for `twp-api.kzokvdevs.dpdns.org` pointing to your tunnel’s address (e.g. `<tunnel-id>.cfargotunnel.com`), as shown in the tunnel’s Public Hostname list.

After fixing DNS, no redeploy is needed; the web app already uses the correct API URL.

### API requests show Response status 0 (CORS)

If the request to `twp-api...` shows **status 0** in DevTools and the page origin is `twp-web...`, the browser is likely blocking the response due to CORS (missing or wrong `Access-Control-Allow-Origin`).

1. **Check the API’s allowed origin** on the server:
   ```bash
   docker exec twp-prod-api printenv ALLOWED_ORIGINS
   ```
   It must be exactly `https://twp-web.kzokvdevs.dpdns.org` (no trailing slash). It is set from `PUBLIC_DOMAIN_WEB` in `docker-compose.prod.yml` via `ALLOWED_ORIGINS: https://${PUBLIC_DOMAIN_WEB:-...}`.

2. **Ensure `.env.prod` has** `PUBLIC_DOMAIN_WEB=twp-web.kzokvdevs.dpdns.org` (no trailing slash), then redeploy so the API container gets the correct env.

3. **Browser console**: Look for a CORS error message, e.g. “blocked by CORS policy: No 'Access-Control-Allow-Origin' header”.

4. **Quick test**: Open `https://twp-api.kzokvdevs.dpdns.org/health/live` in a new tab. If it returns JSON, the API and DNS are fine and the issue is CORS for the web origin.

### Rollback

**Automatic rollback**: If API or web health checks fail after deploy, the
deploy script automatically rolls back: restores the previous git SHA, restores
the pre-migration database backup, rebuilds images, and restarts containers.
The rollback block uses `set +e` so partial failures don't abort the recovery.

**Manual rollback**:
```bash
cd ~/tw-portfolio
git log --oneline -5          # find the commit to roll back to
bash infra/scripts/deploy.sh <commit-sha>
```

**Database migration rollback**: Migrations are NOT automatically reversed by
a code rollback. The deploy script takes a Postgres backup before every
migration and attempts to restore it during automatic rollback. If automatic
DB restore fails, manually restore from `~/.local/state/tw-portfolio/backups/`:
```bash
gunzip -c ~/.local/state/tw-portfolio/backups/<latest>.sql.gz | docker exec -i twp-prod-postgres psql -U twp -d tw_portfolio
```

**Migration runner**: Migrations are executed inside a purpose-built Docker image
(`db/Dockerfile.migrate`) that bakes SQL files in at build time. The runner script
(`infra/scripts/run-migrations.sh`) applies files in sorted order with
`ON_ERROR_STOP=1` and stops on first failure.

**Migration contract**: All `.sql` files in `db/migrations/` must be idempotent
(use `IF NOT EXISTS`, `IF EXISTS` guards). Non-idempotent schema changes require
a versioned migration runner (tracked in backlog).

### Database backup

```bash
bash infra/scripts/backup-postgres.sh
```

Or manually:
```bash
docker exec twp-prod-postgres pg_dump -U twp tw_portfolio > ~/.local/state/tw-portfolio/backups/tw_portfolio_$(date +%Y%m%d_%H%M%S).sql
```

### Expected downtime during deploy

Container recreation causes approximately 10-30 seconds of downtime while
`docker compose up -d` recreates changed containers and the Cloudflare Tunnel
re-establishes. This is acceptable for a home-lab deployment.

### Security Assumptions

- **External TLS**: All public traffic is encrypted via Cloudflare Tunnel. TLS
  terminates at Cloudflare's edge; the tunnel itself uses an authenticated
  encrypted connection to the `cloudflared` container.
- **Internal traffic is unencrypted**: Communication between containers on the
  `twp-prod-net` Docker bridge network (web -> api, api -> postgres, api -> redis)
  uses plaintext protocols. This is acceptable because the bridge network is
  isolated to the Docker host and not routable from the LAN.
- **Postgres**: No `sslmode` -- relies on Docker network isolation.
- **Redis**: Password-authenticated but no TLS -- relies on Docker network isolation.
- If this deployment moves to a multi-host setup, internal TLS must be added.

## Page-load progress bar behavior

- The thin bar at the very top of the viewport during **initial page load** is a **frontend-only visual indicator**.
- It is rendered by the web app’s root layout (`apps/web/app/layout.tsx`) via `LoadingProgressBar` (`apps/web/components/ui/LoadingProgressBar.tsx`) and styled in `apps/web/app/globals.css` (`.loading-progress`, `.loading-progress__bar`).
- The bar:
  - Always shows briefly on first load and enforces a **minimum visible duration** to avoid a “flash”.
  - Advances quickly at first, then **creeps toward ~80%** on slower loads.
  - Jumps to 100% and hides shortly after the frontend considers the page ready.
- It **does not currently track client-side route transitions**; it only reflects the very first load of the app.
- Accessibility / motion:
  - Respects `prefers-reduced-motion` (simplified animation pattern).
  - Uses `aria-live="off"` so screen readers are not spammed with incremental updates.
- Operational notes:
  - This bar is about **perceived performance**, not backend health; use `/health/live` and `/health/ready` for actual service status.
  - If the bar never appears or looks wrong in a given environment, first verify:
    - The web container is serving the expected layout (no custom overrides that drop `LoadingProgressBar`).
    - `globals.css` is loaded and includes `.loading-progress` styles, and theme tokens `--line` / `--accent` are set.
    - No custom header or overlay is masking the bar (it expects to sit on top with `z-index: 1000`).

## Settings drawer behavior

- Open settings from the top-right avatar button.
- Drawer URL state is `/?drawer=settings` for direct linking.
- Drawer now has two tabs: `General` and `Fee Profiles`.
- `Save Settings` persists locale/cost basis/poll interval and fee profile configuration atomically via `/settings/full`.
- Fee profiles support account fallback + per-security overrides.
- New fee profile IDs are generated by the system (UUID).
- `Discard Changes` reverts unsaved edits to last persisted values without closing drawer.
- Closing with unsaved edits shows a warning before discard.

## Localization behavior

- Supported UI locales: `en` and `zh-TW`.
- After saving locale, all visible web wording switches to the selected language, including settings tabs and dialogs.
- If language appears stale, refresh settings by reopening drawer or reloading page and verify `/settings` response.

## Tooltip behavior

- Settings terms and key financial terms on dashboard/forms provide hover/focus tooltips.
- FIFO/LIFO include detailed explanatory tooltip content in settings.
- Tooltips are keyboard accessible through focus on the info icon triggers.

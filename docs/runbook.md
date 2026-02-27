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
- In production-like environments, use `AUTH_MODE=oauth`.
- Recompute history is explicit and audited through preview/confirm APIs.
- For local tests without DB/Redis, set `PERSISTENCE_BACKEND=memory`.

## Production Deployment (QNAP Home Lab)

### Architecture

- **QNAP**: `192.168.2.10` (QTS 5.2.8, x86_64)
- **Deployment orchestrator**: `ubuntu-sshd` container at `192.168.2.61`
- **App network**: Docker bridge `tw-prod-net`
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
| `tw-prod-web`       | `tw-prod-web:latest`         | 3000  |
| `tw-prod-api`       | `tw-prod-api:latest`         | 4000  |
| `tw-prod-postgres`  | `postgres:16`                | 5432  |
| `tw-prod-redis`     | `redis:7`                    | 6379  |
| `tw-prod-cloudflared` | `cloudflare/cloudflared`   | --    |

### First-time setup

1. Clone the repo on the QNAP (inside `ubuntu-sshd` data mount):
   ```bash
   cd /data && git clone <repo-url> tw-portfolio
   ```

2. Create the production env file:
   ```bash
   cp infra/docker/.env.prod.example infra/docker/.env.prod
   # Edit .env.prod with real passwords and tunnel token
   chmod 600 infra/docker/.env.prod
   ```

3. Configure cloudflared tunnel in the Cloudflare Zero Trust dashboard
   (see `infra/cloudflared/README.md`)

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
cd /data/tw-portfolio
bash infra/scripts/deploy.sh
```

### Health checks

- **Liveness**: `GET /health/live` -> `{ "status": "ok" }`
- **Readiness**: `GET /health/ready` -> `{ "status": "ready", "dependencies": { "postgres": true, "redis": true } }`

### Checking logs

```bash
docker logs tw-prod-api --tail 100 -f
docker logs tw-prod-web --tail 100 -f
docker logs tw-prod-postgres --tail 50
docker logs tw-prod-redis --tail 50
docker logs tw-prod-cloudflared --tail 50
```

### Rollback

```bash
cd /data/tw-portfolio
git log --oneline -5          # find the commit to roll back to
git checkout <commit-sha>
bash infra/scripts/deploy.sh
```

### Database backup

```bash
bash infra/scripts/backup-postgres.sh
```

Or manually:
```bash
docker exec tw-prod-postgres pg_dump -U twp tw_portfolio > /data/backups/tw_portfolio_$(date +%Y%m%d_%H%M%S).sql
```

### Security Assumptions

- **External TLS**: All public traffic is encrypted via Cloudflare Tunnel. TLS
  terminates at Cloudflare's edge; the tunnel itself uses an authenticated
  encrypted connection to the `cloudflared` container.
- **Internal traffic is unencrypted**: Communication between containers on the
  `tw-prod-net` Docker bridge network (web -> api, api -> postgres, api -> redis)
  uses plaintext protocols. This is acceptable because the bridge network is
  isolated to the Docker host and not routable from the LAN.
- **Postgres**: No `sslmode` -- relies on Docker network isolation.
- **Redis**: Password-authenticated but no TLS -- relies on Docker network isolation.
- If this deployment moves to a multi-host setup, internal TLS must be added.

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

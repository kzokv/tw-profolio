#!/usr/bin/env bash
set -euo pipefail

DEPLOY_SHA="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/docker/docker-compose.prod.yml"
ENV_FILE="$REPO_ROOT/infra/docker/.env.prod"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-postgres.sh"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.prod.example and configure it." >&2
  exit 1
fi

cd "$REPO_ROOT"

echo "==> Pulling latest code..."
git fetch origin main
if [ -n "$DEPLOY_SHA" ]; then
  echo "  Checking out CI-tested SHA: $DEPLOY_SHA"
  git checkout "$DEPLOY_SHA"
else
  git pull origin main
fi

echo "==> Building images..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo "==> Backing up database before migration..."
if docker ps --format '{{.Names}}' | grep -q '^tw-prod-postgres$'; then
  bash "$BACKUP_SCRIPT"
else
  echo "  Postgres not running; skipping pre-migration backup."
fi

echo "==> Running database migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm tw-prod-migrate

echo "==> Deploying services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

echo "==> Waiting for API health..."
for i in $(seq 1 30); do
  if wget -qO- http://localhost:4000/health/live 2>/dev/null | grep -q '"ok"'; then
    echo "  API healthy after ${i}s"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: API failed health check after 30s" >&2
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail 50 tw-prod-api
    exit 1
  fi
  sleep 1
done

echo "==> Pruning old images..."
docker image prune -f

echo "==> Deploy complete."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

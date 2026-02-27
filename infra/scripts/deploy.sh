#!/usr/bin/env bash
set -euo pipefail

DEPLOY_SHA="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/docker/docker-compose.prod.yml"
ENV_FILE="$REPO_ROOT/infra/docker/.env.prod"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-postgres.sh"
PREVIOUS_SHA=""

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.prod.example and configure it." >&2
  exit 1
fi

set -a; source "$ENV_FILE"; set +a

cd "$REPO_ROOT"
PREVIOUS_SHA="$(git rev-parse HEAD)"

echo "==> Pulling latest code..."
git fetch origin main
if [ -n "$DEPLOY_SHA" ]; then
  echo "  Advancing main to CI-tested SHA: $DEPLOY_SHA"
  git checkout main
  git reset --hard "$DEPLOY_SHA"
else
  git checkout main
  git pull origin main
fi

IMAGE_TAG="$(git rev-parse --short HEAD)"

echo "==> Building images (tag: $IMAGE_TAG)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build
docker tag tw-prod-api:latest "tw-prod-api:$IMAGE_TAG"
docker tag tw-prod-web:latest "tw-prod-web:$IMAGE_TAG"

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
API_HEALTHY=false
for i in $(seq 1 30); do
  if docker exec tw-prod-api wget -qO- http://localhost:4000/health/live 2>/dev/null | grep -q '"ok"'; then
    echo "  API healthy after ${i}s"
    API_HEALTHY=true
    break
  fi
  sleep 1
done

if [ "$API_HEALTHY" = false ]; then
  echo "ERROR: API failed health check after 30s" >&2
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail 50 tw-prod-api
fi

echo "==> Checking web health..."
WEB_HEALTHY=false
for i in $(seq 1 20); do
  if docker exec tw-prod-web wget -qO- http://localhost:3000/ 2>/dev/null | head -c 1 | grep -q '.'; then
    echo "  Web healthy after ${i}s"
    WEB_HEALTHY=true
    break
  fi
  sleep 1
done

if [ "$WEB_HEALTHY" = false ]; then
  echo "ERROR: Web failed health check after 20s" >&2
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail 50 tw-prod-web
fi

if [ "$API_HEALTHY" = false ] || [ "$WEB_HEALTHY" = false ]; then
  echo "==> Rolling back to previous SHA ($PREVIOUS_SHA)..."
  set +e
  git reset --hard "$PREVIOUS_SHA"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build
  if docker ps --format '{{.Names}}' | grep -q '^tw-prod-postgres$'; then
    LATEST_BACKUP="$(ls -t "${BACKUP_DIR:-/data/backups/tw-portfolio}"/*.sql.gz 2>/dev/null | head -1)"
    if [ -n "$LATEST_BACKUP" ]; then
      echo "  Restoring database from $LATEST_BACKUP..."
      gunzip -c "$LATEST_BACKUP" | docker exec -i tw-prod-postgres psql -U "${POSTGRES_USER:-twp}" -d "${POSTGRES_DB:-tw_portfolio}" 2>/dev/null || echo "  WARNING: DB restore failed — manual restore may be needed"
    else
      echo "  WARNING: No backup found for DB restore — schema may be inconsistent"
    fi
  fi
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans
  set -e
  exit 1
fi

echo "==> Pruning old tw-portfolio images..."
docker images --filter "reference=tw-prod-api" --filter "before=tw-prod-api:$IMAGE_TAG" -q | xargs -r docker rmi 2>/dev/null || true
docker images --filter "reference=tw-prod-web" --filter "before=tw-prod-web:$IMAGE_TAG" -q | xargs -r docker rmi 2>/dev/null || true

echo "==> Deploy complete (tag: $IMAGE_TAG)."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

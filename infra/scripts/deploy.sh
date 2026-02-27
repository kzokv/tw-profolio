#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/docker/docker-compose.prod.yml"
ENV_FILE="$REPO_ROOT/infra/docker/.env.prod"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.prod.example and configure it." >&2
  exit 1
fi

cd "$REPO_ROOT"

echo "==> Pulling latest code..."
git pull origin main

echo "==> Running database migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm tw-prod-migrate

echo "==> Building images..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo "==> Deploying services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

echo "==> Pruning old images..."
docker image prune -f

echo "==> Deploy complete."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

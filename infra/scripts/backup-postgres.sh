#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/../docker/.env.prod}"

if [ -f "$ENV_FILE" ]; then
  set -a; source "$ENV_FILE"; set +a
fi

PG_USER="${POSTGRES_USER:-twp}"
PG_DB="${POSTGRES_DB:-tw_portfolio}"
BACKUP_DIR="${BACKUP_DIR:-/data/backups/tw-portfolio}"
RETAIN_DAYS="${RETAIN_DAYS:-30}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="$BACKUP_DIR/${PG_DB}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "==> Backing up ${PG_DB} to $DUMP_FILE"
docker exec tw-prod-postgres pg_dump -U "$PG_USER" "$PG_DB" | gzip > "$DUMP_FILE"

echo "==> Pruning backups older than ${RETAIN_DAYS} days..."
find "$BACKUP_DIR" -name "${PG_DB}_*.sql.gz" -mtime "+${RETAIN_DAYS}" -delete

echo "==> Backup complete: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

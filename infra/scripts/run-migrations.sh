#!/bin/sh
set -e

applied=0
file_count=0

log() { echo "[$(date '+%H:%M:%S')] [migrate] $*"; }

on_exit() {
  rc=$?
  if [ "$rc" -ne 0 ]; then
    log "FAILED after $applied of $file_count migration(s) (exit code $rc)"
  fi
}
trap on_exit EXIT

if [ ! -d /migrations ]; then
  log "ERROR: /migrations directory not found"
  exit 1
fi

sql_files="$(find /migrations -maxdepth 1 -name '*.sql' -type f | sort)"

if [ -z "$sql_files" ]; then
  log "No .sql files in /migrations — nothing to apply"
  exit 0
fi

file_count="$(echo "$sql_files" | wc -l | tr -d ' ')"
log "Found $file_count migration file(s)"
log "Target: ${PGUSER:-?}@${PGHOST:-?}/${PGDATABASE:-?}"

for f in $sql_files; do
  log "Applying $(basename "$f") ..."
  psql -v ON_ERROR_STOP=1 -f "$f"
  applied=$((applied + 1))
  log "  OK ($applied/$file_count)"
done

log "All $applied migration(s) applied successfully"

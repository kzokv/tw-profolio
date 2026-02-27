#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_PATH="${0##*/}"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/docker/docker-compose.prod.yml"
ENV_FILE="$REPO_ROOT/infra/docker/.env.prod"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-postgres.sh"
PREVIOUS_BRANCH=""
PREVIOUS_SHA=""

BRANCH_NAME="main"
BRANCH_REMOTE="origin"
DEPLOY_SHA=""
BRANCH_SPECIFIED=false
SELECT_BRANCH=false
FORCE=false

DEPLOY_TS="$(date +%Y%m%d_%H%M%S)"
STATE_BASE_DIR=""
DEPLOY_LOG_DIR=""
BACKUP_DIR=""
LEGACY_BACKUP_DIR="${LEGACY_BACKUP_DIR:-/data/backups/tw-portfolio}"
DEPLOY_LOG_FILE=""
CONTAINER_LOG_DIR=""
DEPLOY_START_EPOCH=""
PHASE_START_EPOCH=""
IMAGE_TAG=""

# ── Logging ──────────────────────────────────────────────────────

log() {
  echo "[$(date '+%H:%M:%S')] $*"
}

log_phase() {
  echo ""
  log "── $* ──────────────────────────────────"
}

phase_start() {
  PHASE_START_EPOCH=$(date +%s)
  log_phase "$*"
}

phase_done() {
  local elapsed=$(( $(date +%s) - PHASE_START_EPOCH ))
  log "  done (${elapsed}s)"
}

setup_deploy_log() {
  if ! mkdir -p "$DEPLOY_LOG_DIR"; then
    echo "ERROR: Cannot create DEPLOY_LOG_DIR at '$DEPLOY_LOG_DIR'" >&2
    echo "Set DEPLOY_LOG_DIR or TWP_STATE_DIR to a writable path." >&2
    exit 1
  fi
  DEPLOY_LOG_FILE="$DEPLOY_LOG_DIR/deploy_${DEPLOY_TS}.log"
  CONTAINER_LOG_DIR="$DEPLOY_LOG_DIR/deploy_${DEPLOY_TS}_containers"
  exec > >(tee -a "$DEPLOY_LOG_FILE") 2>&1
  log "Deploy log: $DEPLOY_LOG_FILE"
  find "$DEPLOY_LOG_DIR" -maxdepth 1 -name "deploy_*.log" -mtime +30 -delete 2>/dev/null || true
  find "$DEPLOY_LOG_DIR" -maxdepth 1 -name "deploy_*_containers" -type d -mtime +30 -exec rm -rf {} + 2>/dev/null || true
}

collect_container_logs() {
  mkdir -p "$CONTAINER_LOG_DIR"
  local containers="twp-prod-api twp-prod-web twp-prod-postgres twp-prod-redis twp-prod-cloudflared"
  for c in $containers; do
    if docker ps -a --format '{{.Names}}' | grep -q "^${c}$"; then
      docker logs "$c" --tail 200 > "$CONTAINER_LOG_DIR/${c}.log" 2>&1 || true
    fi
  done
  log "Container logs: $CONTAINER_LOG_DIR/"
}

dc() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

# ── Help / args ──────────────────────────────────────────────────

print_help() {
  cat <<EOF
Description:
  Deploy tw-portfolio services with Docker Compose, including migration, health checks, and rollback.

Usage: ${SCRIPT_PATH} [OPTIONS] [DEPLOY_SHA]

Options:
  -h, --help              Show this help message and exit (optional)
  -b, --branch BRANCH     Deploy from this branch (optional, default: main)
  -s, --select-branch     Select deploy branch from numbered local/remote list (optional)
  DEPLOY_SHA              CI-tested commit SHA to deploy from the target branch (optional)

Requirements:
  - Clean git working tree in the tw-portfolio repo (unless --force is used)
  - Docker and docker compose available on PATH
  - Configured env file at infra/docker/.env.prod

Exit codes:
  0  Successful deployment
  1  Validation or deployment failure (including rollback)
EOF
}

error_and_help() {
  echo "ERROR: $1" >&2
  echo >&2
  print_help >&2
  exit 1
}

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -h|--help)
        print_help
        exit 0
        ;;
      -b|--branch)
        if [ "${2-}" = "" ] || [[ "$2" == -* ]]; then
          error_and_help "--branch requires a value"
        fi
        BRANCH_NAME="$2"
        BRANCH_SPECIFIED=true
        shift 2
        ;;
      --branch=*)
        BRANCH_NAME="${1#*=}"
        if [ -z "$BRANCH_NAME" ]; then
          error_and_help "--branch requires a value"
        fi
        BRANCH_SPECIFIED=true
        shift 1
        ;;
      -s|--select-branch)
        SELECT_BRANCH=true
        shift 1
        ;;
      -f|--force)
        FORCE=true
        shift 1
        ;;
      -*)
        error_and_help "Unknown flag: $1"
        ;;
      *)
        if [ -z "$DEPLOY_SHA" ]; then
          DEPLOY_SHA="$1"
          shift 1
        else
          error_and_help "Unexpected argument: $1"
        fi
        ;;
    esac
  done
}

# ── Branch selection ─────────────────────────────────────────────

select_deploy_branch() {
  if [ ! -t 0 ]; then
    error_and_help "--select-branch requires an interactive terminal"
  fi

  local line normalized remote_ref remote_name branch_name branch_number upstream_ref
  local -a options=()
  local -a branch_names=()
  local -a branch_remotes=()

  while IFS= read -r line; do
    normalized="$(echo "$line" | sed -E 's/^[*[:space:]]+//')"
    [ -z "$normalized" ] && continue
    [[ "$normalized" == *" -> "* ]] && continue

    if [[ "$normalized" == remotes/*/* ]]; then
      remote_ref="${normalized#remotes/}"
      remote_name="${remote_ref%%/*}"
      branch_name="${remote_ref#*/}"
      [ -z "$branch_name" ] && continue
      options+=("[remote] ${remote_name}/${branch_name}")
      branch_names+=("$branch_name")
      branch_remotes+=("$remote_name")
      continue
    fi

    options+=("[local]  ${normalized}")
    branch_names+=("$normalized")
    branch_remotes+=("")
  done < <(git branch -a)

  if [ "${#options[@]}" -eq 0 ]; then
    error_and_help "No branches found via git branch -a"
  fi

  echo "==> Select deploy branch (local + remote):"
  for i in "${!options[@]}"; do
    echo "  $((i + 1))) ${options[$i]}"
  done

  read -r -p "Enter branch number [1-${#options[@]}]: " branch_number
  if ! [[ "$branch_number" =~ ^[0-9]+$ ]] || [ "$branch_number" -lt 1 ] || [ "$branch_number" -gt "${#options[@]}" ]; then
    error_and_help "Invalid branch selection: $branch_number"
  fi

  BRANCH_NAME="${branch_names[$((branch_number - 1))]}"
  if [ -n "${branch_remotes[$((branch_number - 1))]}" ]; then
    BRANCH_REMOTE="${branch_remotes[$((branch_number - 1))]}"
    echo "  Selected remote branch: ${BRANCH_REMOTE}/${BRANCH_NAME}"
  else
    upstream_ref="$(git rev-parse --abbrev-ref "${BRANCH_NAME}@{upstream}" 2>/dev/null || true)"
    if [ -n "$upstream_ref" ] && [[ "$upstream_ref" == */* ]]; then
      BRANCH_REMOTE="${upstream_ref%%/*}"
    else
      BRANCH_REMOTE="origin"
    fi
    echo "  Selected local branch: $BRANCH_NAME (pull remote: $BRANCH_REMOTE)"
  fi
}

# ── Git checkout ─────────────────────────────────────────────────

checkout_deploy_ref() {
  local branch="$1"
  local sha="$2"
  local remote="$3"

  log "Pulling latest for '$branch' (remote: $remote)..."
  git fetch "$remote" "$branch"

  if git show-ref --verify --quiet "refs/heads/$branch"; then
    git checkout "$branch"
  elif git show-ref --verify --quiet "refs/remotes/$remote/$branch"; then
    log "Local branch '$branch' missing; creating from $remote/$branch"
    git checkout -b "$branch" "$remote/$branch"
  else
    log "ERROR: Branch '$branch' not found locally or on $remote."
    exit 1
  fi

  if [ -n "$sha" ]; then
    log "Validating $sha is reachable from $remote/$branch..."
    if ! git merge-base --is-ancestor "$sha" "$remote/$branch"; then
      log "ERROR: SHA $sha is not an ancestor of $remote/$branch"
      exit 1
    fi
    log "Advancing $branch to CI-tested SHA: $sha"
    git reset --hard "$sha"
  else
    git pull --ff-only "$remote" "$branch"
  fi
}

# ── Rollback ─────────────────────────────────────────────────────

rollback() {
  log_phase "ROLLBACK: restoring previous state (branch: ${PREVIOUS_BRANCH:-detached}, sha: ${PREVIOUS_SHA:-unknown})"
  set +e

  if [ -n "$PREVIOUS_BRANCH" ]; then
    git checkout "$PREVIOUS_BRANCH"
  fi
  git reset --hard "$PREVIOUS_SHA"

  dc --profile migrate build
  if docker ps --format '{{.Names}}' | grep -q '^twp-prod-postgres$'; then
    LATEST_BACKUP="$(ls -t "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | head -1)"
    if [ -z "$LATEST_BACKUP" ]; then
      LATEST_BACKUP="$(ls -t "${LEGACY_BACKUP_DIR}"/*.sql.gz 2>/dev/null | head -1)"
    fi
    if [ -n "$LATEST_BACKUP" ]; then
      log "Restoring database from $LATEST_BACKUP..."
      gunzip -c "$LATEST_BACKUP" | docker exec -i twp-prod-postgres psql -U "${POSTGRES_USER:-twp}" -d "${POSTGRES_DB:-tw_portfolio}" 2>/dev/null \
        || log "WARNING: DB restore failed — manual restore may be needed"
    else
      log "WARNING: No backup found for DB restore — schema may be inconsistent"
    fi
  fi

  dc up -d --remove-orphans
  set -e
}

# ── Main ─────────────────────────────────────────────────────────

parse_args "$@"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.prod.example and configure it." >&2
  exit 1
fi

set -a; source "$ENV_FILE"; set +a

DEFAULT_HOME="${HOME:-$REPO_ROOT}"
STATE_BASE_DIR="${TWP_STATE_DIR:-$DEFAULT_HOME/.local/state/tw-portfolio}"
DEPLOY_LOG_DIR="${DEPLOY_LOG_DIR:-$STATE_BASE_DIR/logs/deploy}"
BACKUP_DIR="${BACKUP_DIR:-$STATE_BASE_DIR/backups}"
export DEPLOY_LOG_DIR BACKUP_DIR

cd "$REPO_ROOT"
if [ "$SELECT_BRANCH" = true ] && [ "$BRANCH_SPECIFIED" = true ]; then
  error_and_help "Use either --branch or --select-branch, not both"
fi
if [ "$FORCE" != true ] && [ -n "$(git status --porcelain)" ]; then
  error_and_help "Working tree is not clean; commit, stash, or rerun with --force to proceed (uncommitted changes may be lost)"
fi

setup_deploy_log
DEPLOY_START_EPOCH=$(date +%s)

if [ "$SELECT_BRANCH" = true ]; then
  select_deploy_branch
fi

log "Deploy started by $(whoami)@$(hostname)"
log "Branch: $BRANCH_NAME | Remote: $BRANCH_REMOTE | SHA arg: ${DEPLOY_SHA:-HEAD}"

PREVIOUS_BRANCH="$(git symbolic-ref --quiet --short HEAD || true)"
PREVIOUS_SHA="$(git rev-parse HEAD)"

# ── Phase 1: Checkout ────────────────────────────────────────────

phase_start "Checkout"
checkout_deploy_ref "$BRANCH_NAME" "$DEPLOY_SHA" "$BRANCH_REMOTE"
IMAGE_TAG="$(git rev-parse --short HEAD)"
log "Deploy SHA: $(git rev-parse HEAD) (tag: $IMAGE_TAG)"
phase_done

# ── Phase 2: Build ───────────────────────────────────────────────

phase_start "Build images (tag: $IMAGE_TAG)"
dc --profile migrate build
docker tag twp-prod-api:latest "twp-prod-api:$IMAGE_TAG"
docker tag twp-prod-web:latest "twp-prod-web:$IMAGE_TAG"
phase_done

# ── Phase 3: Pre-migration backup ───────────────────────────────

phase_start "Pre-migration database backup"
if docker ps --format '{{.Names}}' | grep -q '^twp-prod-postgres$'; then
  bash "$BACKUP_SCRIPT"
else
  log "Postgres not running; skipping pre-migration backup"
fi
phase_done

# ── Phase 4: Migrate ────────────────────────────────────────────

phase_start "Database migrations"
if ! dc --profile migrate run --rm twp-prod-migrate; then
  log "ERROR: Migration failed — triggering rollback"
  collect_container_logs
  rollback
  exit 1
fi
phase_done

# ── Phase 5: Deploy ─────────────────────────────────────────────

phase_start "Deploy services"
dc up -d --remove-orphans
phase_done

# ── Phase 6: Health checks ──────────────────────────────────────

phase_start "Health checks"

API_HEALTHY=false
log "Waiting for API health (up to 30s)..."
for i in $(seq 1 30); do
  if docker exec twp-prod-api wget -qO- http://localhost:4000/health/live 2>/dev/null | grep -q '"ok"'; then
    log "  API healthy after ${i}s"
    API_HEALTHY=true
    break
  fi
  sleep 1
done

if [ "$API_HEALTHY" = false ]; then
  log "ERROR: API failed health check after 30s"
  dc logs --tail 50 twp-prod-api
fi

WEB_HEALTHY=false
log "Waiting for Web health (up to 20s)..."
for i in $(seq 1 20); do
  if docker exec twp-prod-web wget -qO- http://localhost:3000/ 2>/dev/null | head -c 1 | grep -q '.'; then
    log "  Web healthy after ${i}s"
    WEB_HEALTHY=true
    break
  fi
  sleep 1
done

if [ "$WEB_HEALTHY" = false ]; then
  log "ERROR: Web failed health check after 20s"
  dc logs --tail 50 twp-prod-web
fi

phase_done

# ── Collect container logs ───────────────────────────────────────

collect_container_logs

# ── Rollback or success ─────────────────────────────────────────

if [ "$API_HEALTHY" = false ] || [ "$WEB_HEALTHY" = false ]; then
  rollback
  exit 1
fi

# ── Phase 7: Cleanup ────────────────────────────────────────────

phase_start "Cleanup"
docker images --filter "reference=twp-prod-api" --filter "before=twp-prod-api:$IMAGE_TAG" -q | xargs -r docker rmi 2>/dev/null || true
docker images --filter "reference=twp-prod-web" --filter "before=twp-prod-web:$IMAGE_TAG" -q | xargs -r docker rmi 2>/dev/null || true
phase_done

# ── Summary ──────────────────────────────────────────────────────

DEPLOY_ELAPSED=$(( $(date +%s) - DEPLOY_START_EPOCH ))
log_phase "Deploy complete"
log "Tag:      $IMAGE_TAG"
log "Branch:   $BRANCH_NAME"
log "SHA:      $(git rev-parse HEAD)"
log "Duration: ${DEPLOY_ELAPSED}s"
log "Log:      $DEPLOY_LOG_FILE"
echo ""
dc ps

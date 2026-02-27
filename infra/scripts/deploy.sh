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

checkout_deploy_ref() {
  local branch="$1"
  local sha="$2"
  local remote="$3"

  echo "==> Pulling latest code for branch '$branch' (remote: $remote)..."
  git fetch "$remote" "$branch"

  if git show-ref --verify --quiet "refs/heads/$branch"; then
    git checkout "$branch"
  elif git show-ref --verify --quiet "refs/remotes/$remote/$branch"; then
    echo "  Local branch '$branch' missing; creating tracking branch from $remote/$branch"
    git checkout -b "$branch" "$remote/$branch"
  else
    echo "ERROR: Branch '$branch' not found locally or on $remote." >&2
    exit 1
  fi

  if [ -n "$sha" ]; then
    echo "  Validating that $sha is reachable from $remote/$branch..."
    if ! git merge-base --is-ancestor "$sha" "$remote/$branch"; then
      echo "ERROR: SHA $sha is not an ancestor of $remote/$branch" >&2
      exit 1
    fi
    echo "  Advancing $branch to CI-tested SHA: $sha"
    git reset --hard "$sha"
  else
    git pull --ff-only "$remote" "$branch"
  fi
}

parse_args "$@"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.prod.example and configure it." >&2
  exit 1
fi

set -a; source "$ENV_FILE"; set +a

cd "$REPO_ROOT"
if [ "$SELECT_BRANCH" = true ] && [ "$BRANCH_SPECIFIED" = true ]; then
  error_and_help "Use either --branch or --select-branch, not both"
fi
if [ "$FORCE" != true ] && [ -n "$(git status --porcelain)" ]; then
  error_and_help "Working tree is not clean; commit, stash, or rerun with --force to proceed (uncommitted changes may be lost)"
fi
if [ "$SELECT_BRANCH" = true ]; then
  select_deploy_branch
fi
PREVIOUS_BRANCH="$(git symbolic-ref --quiet --short HEAD || true)"
PREVIOUS_SHA="$(git rev-parse HEAD)"

checkout_deploy_ref "$BRANCH_NAME" "$DEPLOY_SHA" "$BRANCH_REMOTE"

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
  echo "==> Rolling back to previous state (branch: ${PREVIOUS_BRANCH:-detached}, sha: $PREVIOUS_SHA)..."
  set +e
  if [ -n "$PREVIOUS_BRANCH" ]; then
    git checkout "$PREVIOUS_BRANCH"
  fi
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

#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env"
declare -A DEFAULT_PORTS=( ["web"]="3333" ["api"]="4000" )

error() {
  printf '%s\n' "$1" >&2
  exit 1
}

usage() {
  error "Usage: $0 [web|api|PORT]"
}

map_env_key() {
  case "$1" in
    web) printf 'WEB_PORT';;
    api) printf 'API_PORT';;
    *) printf '%s' "$1";;
  esac
}

resolve_port() {
  local service="$1"
  local env_key
  env_key=$(map_env_key "$service")

  if [[ -f "$ENV_FILE" ]]; then
    local value
    value=$(grep -E "^[[:space:]]*${env_key}=" "$ENV_FILE" | head -n 1 | cut -d= -f2- | tr -d '[:space:]')
    printf '%s' "$value"
  fi
}

kill_by_port() {
  local port="$1"
  local label="$2"

  printf 'Looking for processes listening on port %s (%s)...\n' "$port" "$label"
  local pids
  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)

  if [[ -z "$pids" ]]; then
    printf 'No process listening on port %s (%s) was found.\n' "$port" "$label"
    return 0
  fi

  printf 'Killing process(es) %s that hold port %s (%s)...\n' "$pids" "$port" "$label"
  kill $pids
  printf 'Signal sent; verify the port is free with: lsof -iTCP:%s -sTCP:LISTEN\n' "$port"
}

if ! command -v lsof >/dev/null 2>&1; then
  error "This script requires lsof to find the listening process."
fi

if [[ "${1:-}" =~ ^- ]]; then
  usage
fi

if [[ "${1:-}" =~ ^[0-9]+$ ]]; then
  kill_by_port "$1" "custom port"
  exit 0
fi

declare -a services=()

if [[ -n "${1:-}" ]]; then
  case "$1" in
    web|api) services=("$1");;
    *) usage;;
  esac
else
  services=(web api)
fi

for service in "${services[@]}"; do
  port="$(resolve_port "$service")"
  port="${port:-${DEFAULT_PORTS[$service]}}"

  if [[ -z "$port" ]]; then
    printf 'No port configured for %s; skipping.\n' "$service"
    continue
  fi

  kill_by_port "$port" "$service"
done

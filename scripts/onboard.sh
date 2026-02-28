#!/usr/bin/env bash
#
# Onboarding script for tw-portfolio (run from repo root).
#
# What it does:
#   1. Installs npm dependencies (npm ci if lockfile present, else npm install).
#   2. Installs Playwright browsers (project-level: npm run playwright:install).
#   3. If .env is missing and .env.example exists, copies .env.example to .env and reminds you to edit.
#   4. Runs a quick sanity check (lint) to verify setup.
#
# Idempotent: safe to run multiple times. Re-running will reinstall deps and Playwright;
# it will not overwrite an existing .env.
#
# Usage: ./scripts/onboard.sh   or   npm run onboard
#
set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> tw-portfolio onboarding (root: $REPO_ROOT)"
FAIL=0

# ---------------------------------------------------------------------------
# 1. npm dependencies
# ---------------------------------------------------------------------------
echo ""
echo "[1/4] Installing npm dependencies..."
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
echo "     Done."

# ---------------------------------------------------------------------------
# 2. Playwright browsers (project-level)
# ---------------------------------------------------------------------------
echo ""
echo "[2/4] Installing Playwright browsers (project-level)..."
npm run playwright:install
echo "     Done."

# ---------------------------------------------------------------------------
# 3. .env from .env.example if missing
# ---------------------------------------------------------------------------
echo ""
echo "[3/4] Checking .env..."
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "     Created .env from .env.example. Edit .env if you need different DB/Redis or ports."
  else
    echo "     No .env or .env.example found. Create .env with at least: AUTH_MODE, PERSISTENCE_BACKEND, optional DB_URL, REDIS_URL (see docs/runbook.md)."
  fi
else
  echo "     .env already exists; leaving it unchanged."
fi

# ---------------------------------------------------------------------------
# 4. Sanity check (lint)
# ---------------------------------------------------------------------------
echo ""
echo "[4/4] Sanity check (lint)..."
if npm run lint; then
  echo "     Lint passed."
else
  echo "     Lint failed (see above). Fix errors and re-run if needed."
  FAIL=1
fi

# ---------------------------------------------------------------------------
# Summary and next steps
# ---------------------------------------------------------------------------
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "==> Onboarding finished successfully."
  echo ""
  echo "Next steps:"
  echo "  - If you use Postgres/Redis: start infra with"
  echo "      docker compose -f infra/docker/docker-compose.yml up -d"
  echo "  - Start API and web:  npm run dev"
  echo "  - Run tests:  npm run test:unit | npm run test:integration | npm run test:e2e"
  echo ""
else
  echo "==> Onboarding completed with errors (see above). Fix and re-run as needed."
  exit 1
fi

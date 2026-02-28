#!/usr/bin/env bash
#
# Clean build artifacts and dependencies: removes node_modules and dist directories.
#
# Default: removes only under libs/ (REPO_ROOT/libs).
# With --all or --full: also removes node_modules and dist under apps/ and repo root.
#
# Removes:
#   - node_modules  (dependency trees)
#   - dist          (build output)
#
# Idempotent: safe to run multiple times; no-op if nothing to remove.
#
# Usage:
#   ./scripts/clean-libs.sh              # remove node_modules and dist under libs/
#   ./scripts/clean-libs.sh --all         # remove under libs/, apps/, and repo root
#   ./scripts/clean-libs.sh --dry-run     # list what would be removed
#   ./scripts/clean-libs.sh --help        # show this help
#
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIBS_DIR="${REPO_ROOT}/libs"
DRY_RUN=false
CLEAN_ROOT="$LIBS_DIR"

usage() {
  sed -n '2,19p' "$0" | sed 's/^# \?//'
  echo ""
  echo "Options:"
  echo "  --dry-run      List paths that would be removed; do not delete."
  echo "  --all, --full  Expand scope to apps/ and repo root (default: libs/ only)."
  echo "  --help, -h     Show this help and exit."
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --all|--full) CLEAN_ROOT="$REPO_ROOT" ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
  shift
done

# Validation: search root must exist
if [ ! -d "$CLEAN_ROOT" ]; then
  echo "Error: directory not found at $CLEAN_ROOT" >&2
  exit 1
fi

removed_count=0
for dir in node_modules dist; do
  while IFS= read -r -d '' path; do
    if [ "$DRY_RUN" = true ]; then
      echo "[dry-run] would remove: $path"
    else
      rm -rf "$path"
      echo "Removed: $path"
    fi
    removed_count=$((removed_count + 1))
  done < <(find "$CLEAN_ROOT" -type d -name "$dir" -print0)
done

if [ $removed_count -eq 0 ]; then
  echo "Nothing to clean under $CLEAN_ROOT (no node_modules or dist found)."
elif [ "$DRY_RUN" = true ]; then
  echo "[dry-run] $removed_count path(s) would be removed. Run without --dry-run to delete."
fi

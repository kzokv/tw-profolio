#!/usr/bin/env bash
set -euo pipefail

has_libglib="false"

if command -v ldconfig >/dev/null 2>&1; then
  if ldconfig -p 2>/dev/null | grep -q 'libglib-2.0.so.0'; then
    has_libglib="true"
  fi
fi

if [[ "$has_libglib" != "true" ]]; then
  for candidate in \
    /lib/x86_64-linux-gnu/libglib-2.0.so.0 \
    /usr/lib/x86_64-linux-gnu/libglib-2.0.so.0 \
    /usr/lib64/libglib-2.0.so.0
  do
    if [[ -f "$candidate" ]]; then
      has_libglib="true"
      break
    fi
  done
fi

if [[ "$has_libglib" != "true" ]]; then
  echo "Skipping Playwright E2E: missing OS dependency libglib-2.0.so.0"
  echo "Run strict E2E in an environment with Playwright system libraries installed."
  exit 0
fi

echo "Playwright dependencies detected. Running E2E suite."
npx playwright test

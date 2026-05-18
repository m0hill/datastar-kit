#!/usr/bin/env bash
set -euo pipefail

typecheck_log=$(mktemp)
test_log=$(mktemp)
trap 'rm -f "$typecheck_log" "$test_log"' EXIT

if ! pnpm run typecheck >"$typecheck_log" 2>&1; then
  tail -80 "$typecheck_log"
  exit 1
fi

if ! pnpm run test -- --reporter=dot >"$test_log" 2>&1; then
  tail -80 "$test_log"
  exit 1
fi

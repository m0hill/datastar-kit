#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d src ] && [ ! -d test ]; then
  echo "METRIC prototype_score=0"
  echo "METRIC tests=0"
  echo "METRIC ts_files=0"
  exit 0
fi

if [ ! -d node_modules ]; then
  pnpm install --silent >/dev/null
fi

pnpm exec tsc --noEmit
pnpm exec vitest run --reporter=dot

tests=$(find test -type f \( -name '*.test.ts' -o -name '*.spec.ts' -o -name '*.test.tsx' -o -name '*.spec.tsx' \) -print0 2>/dev/null | xargs -0 grep -E "^[[:space:]]*(it|test)\(" 2>/dev/null | wc -l | tr -d ' ')
ts_files=$(find src test -type f \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null | wc -l | tr -d ' ')

echo "METRIC prototype_score=${tests:-0}"
echo "METRIC tests=${tests:-0}"
echo "METRIC ts_files=${ts_files:-0}"

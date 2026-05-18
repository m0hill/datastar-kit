#!/bin/bash
set -euo pipefail

pnpm run typecheck >/tmp/ts-star-typecheck.log 2>&1 || {
  tail -80 /tmp/ts-star-typecheck.log
  exit 1
}

pnpm run test >/tmp/ts-star-test.log 2>&1 || {
  tail -80 /tmp/ts-star-test.log
  exit 1
}

pnpm run build >/tmp/ts-star-build.log 2>&1 || {
  tail -80 /tmp/ts-star-build.log
  exit 1
}

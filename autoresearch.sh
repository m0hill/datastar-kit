#!/bin/bash
set -euo pipefail

# Count forbidden Effect/runtime references in implementation-facing files.
# Docs may discuss the comparison; source, examples, tests, and package metadata must not require Effect.
forbidden_effect_refs=$({ rg -n \
  '(@effect|effect/|"effect"|\bEffect\.|\bLayer\.|\bContext\.|\bScope\.|\bStream\.|\bSchema\.)' \
  src examples test package.json pnpm-lock.yaml tsconfig.json \
  --glob '!dist/**' \
  --glob '!node_modules/**' \
  2>/dev/null || true; } | wc -l | tr -d ' ')

old_root_exports=$({ rg -n 'export \* as (contract|live) ' src/index.ts 2>/dev/null || true; } | wc -l | tr -d ' ')

src_bytes=$(find src -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 | xargs -0 wc -c | tail -1 | awk '{print $1}')
test_files=$(find test -maxdepth 1 -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l | tr -d ' ')

migration_debt=$(( forbidden_effect_refs * 1000 + old_root_exports * 100 ))

printf 'METRIC migration_debt=%s\n' "$migration_debt"
printf 'METRIC forbidden_effect_refs=%s\n' "$forbidden_effect_refs"
printf 'METRIC old_root_exports=%s\n' "$old_root_exports"
printf 'METRIC src_bytes=%s\n' "$src_bytes"
printf 'METRIC test_files=%s\n' "$test_files"

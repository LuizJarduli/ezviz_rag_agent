#!/usr/bin/env bash
# Merge manifest-ordered partner docs into a PDF via Pandoc (ADR-002).
# Runs validation first (ADR-004), then scripts/partner-docs/build.ts.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

node --experimental-strip-types "${SCRIPT_DIR}/validate.ts" "$@"
exec node --experimental-strip-types "${SCRIPT_DIR}/build.ts" "$@"

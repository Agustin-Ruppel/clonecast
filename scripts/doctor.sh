#!/usr/bin/env bash
# scripts/doctor.sh — shell wrapper for `npm run doctor`
set -euo pipefail
cd "$(dirname "$0")/.."
exec npm run doctor "$@"

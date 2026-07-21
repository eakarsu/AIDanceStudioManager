#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
[[ "${CONFIRM_DEMO_SEED:-}" == yes && "${NODE_ENV:-development}" != production ]] || { echo 'Demo seed requires CONFIRM_DEMO_SEED=yes and non-production NODE_ENV.' >&2; exit 2; }
(cd "$project_dir" && node server/seeds/seed.js)

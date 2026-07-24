#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$project_dir/.env" ]] || { echo 'Missing .env; copy .env.example and configure it.' >&2; exit 1; }
[[ -d "$project_dir/node_modules" && -d "$project_dir/client/node_modules" ]] || { echo 'Dependencies missing; run scripts/bootstrap.sh.' >&2; exit 1; }
set -a; source "$project_dir/.env"; set +a
if [[ "${NODE_ENV:-development}" == test && -z "${PII_ENCRYPTION_KEY:-}" ]]; then
  export PII_ENCRYPTION_KEY=runtime-acceptance-pii-encryption-key
fi
(cd "$project_dir" && node <<'NODE'
require('dotenv').config({ path: '.env' });
const required = ['DATABASE_URL', 'JWT_SECRET', 'PII_ENCRYPTION_KEY'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}
if (process.env.JWT_SECRET.length < 32 || process.env.PII_ENCRYPTION_KEY.length < 32) {
  throw new Error('JWT_SECRET and PII_ENCRYPTION_KEY must each contain at least 32 characters');
}
NODE
)
if [[ "${MIGRATE_ON_START:-false}" == true ]]; then node "$project_dir/server/scripts/migrate.js"; node "$project_dir/server/scripts/provision-admin.js"; fi
(cd "$project_dir" && node server/index.js) & backend_pid=$!
(cd "$project_dir/client" && npm run dev -- --host "${FRONTEND_HOST:-127.0.0.1}" --port "${FRONTEND_PORT:-${CLIENT_PORT:-3000}}") & frontend_pid=$!
cleanup(){ kill "$backend_pid" "$frontend_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
wait "$backend_pid" "$frontend_pid"

#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
[[ -f "$project_dir/.env" ]] || cp "$project_dir/.env.example" "$project_dir/.env"
(cd "$project_dir" && npm ci)
(cd "$project_dir/client" && npm ci)

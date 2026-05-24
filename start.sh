#!/usr/bin/env bash
# Para Linux/WSL: ./start.sh
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js no instalado. Get from https://nodejs.org"; exit 1; }
exec node scripts/launch.mjs

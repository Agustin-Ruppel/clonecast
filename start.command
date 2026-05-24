#!/usr/bin/env bash
# Double-click este archivo en Finder para lanzar Clonecast.
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display dialog "Node.js no está instalado. Instalalo desde https://nodejs.org y volvé a hacer doble-click acá." with title "Clonecast" buttons {"OK"}'
  exit 1
fi

NODE_VERSION=$(node -v | cut -dv -f2 | cut -d. -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  osascript -e 'display dialog "Necesitás Node 22 o superior. Tu versión actual es muy vieja." with title "Clonecast" buttons {"OK"}'
  exit 1
fi

osascript -e 'display notification "Iniciando Clonecast... esto tarda 5-30s la primera vez." with title "Clonecast"'

exec node scripts/launch.mjs

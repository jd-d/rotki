#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./run-dev-dual.sh <backend|frontend>

  backend   Start the Python backend on ports 4242/4333 (Terminal A)
  frontend  Start the Vue/Electron frontend with backend-disabled overrides (Terminal B)
EOF
}

if [ "${1:-}" = "" ]; then
  usage
  exit 1
fi

MODE="$1"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ensure_nvm() {
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$HOME/.nvm/nvm.sh"
  elif command -v nvm >/dev/null 2>&1; then
    :
  else
    echo "error: nvm not found. Install NVM (see PIPELINE.md) before running this script." >&2
    exit 1
  fi

  nvm use 22
}

ensure_corepack() {
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@10.15.0 --activate
  else
    echo "error: corepack not available. Ensure Node.js 22 is installed with Corepack enabled." >&2
    exit 1
  fi
}

activate_venv() {
  if [ -f ".venv/bin/activate" ]; then
    # shellcheck disable=SC1091
    source ".venv/bin/activate"
  else
    echo "warning: .venv not found; continuing without activating a virtualenv" >&2
  fi
}

case "$MODE" in
  backend)
    activate_venv
    if ! command -v uv >/dev/null 2>&1; then
      echo "error: uv not found. Install uv per PIPELINE.md before launching the backend." >&2
      exit 1
    fi
    uv run python -m rotkehlchen --api-port 4242 --websockets-port 4333
    ;;
  frontend)
    activate_venv
    ensure_nvm
    ensure_corepack
    pushd frontend >/dev/null
    if [ ! -d "node_modules" ]; then
      pnpm install --frozen-lockfile
    fi
    ROTKI_BACKEND_DISABLED=true \
    VITE_API_URL=http://127.0.0.1:4242 \
      pnpm run dev
    popd >/dev/null
    ;;
  *)
    usage
    exit 1
    ;;
esac

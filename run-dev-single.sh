#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [ -f ".venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  source ".venv/bin/activate"
else
  echo "warning: .venv not found; continuing without activating a virtualenv" >&2
fi

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

if command -v corepack >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@10.15.0 --activate
else
  echo "error: corepack not available. Ensure Node.js 22 is installed with Corepack enabled." >&2
  exit 1
fi

pushd frontend >/dev/null

if [ ! -d "node_modules" ]; then
  pnpm install --frozen-lockfile
fi

pnpm run dev

popd >/dev/null

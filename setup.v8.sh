#!/usr/bin/env bash
#
# setup.v8.sh
#
# Author: Gemini (Google AI)
#
# Changelog:
# v8 - 2025-10-27:
#   - Re-confirmed the necessity of the `--no-project` flag for `uv run` smoke tests.
#     This prevents `uv` from resolving project dependencies (like git repos) and
#     hitting GitHub API rate limits (403 Forbidden errors) during simple checks.
# v7 - 2025-10-27:
#   - Consolidated setup and maintenance logic into a single, robust script.
#

set -euo pipefail

echo "[setup v8] Start unified environment bootstrap"

# ---------------------------
# 1) System & Tooling Bootstrap
# ---------------------------
has() { command -v "$1" >/dev/null 2>&1; }

if has apt-get; then
  echo "[setup v8] Apt bootstrap: Installing base packages..."
  if sudo apt-get update -y; then
    if ! sudo apt-get install -y --no-install-recommends curl ca-certificates gnupg git-lfs; then
      echo "[setup v8][warn] apt install failed, continuing without optional packages" >&2
    fi
  else
    echo "[setup v8][warn] apt update failed, skipping apt package installation" >&2
  fi
fi

# ---------------------------
# 2) Node.js & pnpm Environment
# ---------------------------
PNPM_VERSION="10.15.0"
NODE_MAJOR="22"
NVM_DIR="${HOME}/.nvm"

echo "[setup v8] Configuring Node.js v${NODE_MAJOR} via nvm..."
if [ ! -d "${NVM_DIR}" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

# Source NVM to make it available for the rest of this script's execution
# shellcheck disable=SC1091
. "${NVM_DIR}/nvm.sh"

if ! nvm ls "${NODE_MAJOR}" >/dev/null 2>&1; then
  nvm install "${NODE_MAJOR}"
fi
nvm use "${NODE_MAJOR}"
nvm alias default "${NODE_MAJOR}"

echo "[setup v8] Enabling Corepack and preparing pnpm@${PNPM_VERSION}..."
corepack enable
corepack prepare "pnpm@${PNPM_VERSION}" --activate

export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
export PATH="$PNPM_HOME:$PATH"

# ---------------------------
# 3) Python & uv Environment
# ---------------------------
UV_PY_VERSION="3.11.13"

# Safety cleanup: Remove any stray .venv that could confuse tool detection.
rm -rf .venv

if ! has uv; then
  echo "[setup v8] Installing uv..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi
export PATH="$HOME/.local/bin:$PATH"

echo "[setup v8] Installing Python ${UV_PY_VERSION} via uv..."
uv python install "${UV_PY_VERSION}"
UV_PY_PATH="$(uv python find "${UV_PY_VERSION}")"
export UV_PYTHON="${UV_PY_PATH}"

# ---------------------------
# 4) Application & Docs Dependencies
# ---------------------------

# Install Frontend Dependencies
if [ -f "frontend/package.json" ]; then
  echo "[setup v8] Frontend detected, installing dependencies..."
  if [ ! -f frontend/.npmrc ]; then
    printf "registry=https://registry.npmjs.org/\nalways-auth=false\n" > frontend/.npmrc
  fi
  if ! pnpm -C frontend install --frozen-lockfile; then
    echo "[setup v8][warn] pnpm install failed, retrying without lifecycle scripts" >&2
    if pnpm -C frontend install --frozen-lockfile --ignore-scripts; then
      echo "[setup v8] Manually replaying skipped frontend lifecycle scripts..."
      if ! (cd frontend && node scripts/check-versions.js); then
        echo "[setup v8][warn] frontend version check failed" >&2
      fi
      if ! pnpm -C frontend run --filter @rotki/common build; then
        echo "[setup v8][warn] failed to build @rotki/common" >&2
      fi
      if ! pnpm -C frontend run --filter rotki postinstall; then
        echo "[setup v8][warn] frontend postinstall failed" >&2
      fi
    else
      echo "[setup v8][error] pnpm install failed even when ignoring scripts" >&2
      exit 1
    fi
  fi
fi

# Install Python Docs Dependencies
echo "[setup v8] Configuring Python docs toolchain..."
# Use the globally active python for this, as it's a toolchain setup
if ! python -m pip install --upgrade pip; then
  echo "[setup v8][warn] pip upgrade failed; continuing with existing version" >&2
fi
if [ -f docs/requirements.txt ]; then
  if ! python -m pip install -r docs/requirements.txt; then
    echo "[setup v8][warn] docs requirements installation failed" >&2
  fi
else
  if ! python -m pip install "sphinx>=7" myst-parser sphinx-rtd-theme; then
    echo "[setup v8][warn] default docs dependencies installation failed" >&2
  fi
fi
if has apt-get; then
  (sudo apt-get install -y --no-install-recommends graphviz) || echo "[warn] Skipping optional graphviz install"
fi

# ---------------------------
# 5) Final Verification & Smoke Tests
# ---------------------------
echo "[verify v8] Running final verification and smoke tests..."

if has git-lfs; then
  echo "[verify v8] Fetching Git LFS objects..."
  git lfs fetch --all
  git lfs checkout
fi

echo "[verify v8] Checking tool versions..."
echo "  - node: $(node -v)"
echo "  - pnpm: $(pnpm --version)"
echo "  - uv: $(uv --version)"
echo "  - sphinx: $(python -m sphinx --version)"

echo "[verify v8] Running isolated Python smoke test via uv..."
if [ -n "${UV_PYTHON:-}" ]; then
  # This is the critical command. `--no-project` prevents `uv` from trying to
  # resolve project dependencies and hitting the GitHub API rate limit.
  uv run --no-project --python "${UV_PYTHON}" -- python -c "import sys; print(f'✅ Python smoke test PASSED. Version: {sys.version.split()[0]}')"
else
  echo "❌ CRITICAL: Could not run Python smoke test, UV_PYTHON was not set." >&2
  exit 1
fi

echo "[setup v8] ✅ Done! Environment is ready. ✨"

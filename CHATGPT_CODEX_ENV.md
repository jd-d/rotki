# ChatGPT Codex Environment Setup

This document centralizes the resources required to run rotki in the ChatGPT Codex managed environment. The setup script lives here so it can be copied into the **Setup script** field of the environment settings. The script is **never** executed directly from the repository checkout.

## Setup Script

> Copy the following block verbatim into the ChatGPT Codex Rotki environment's **Setup script** field. It is intended for that UI only.

```bash
#!/usr/bin/env bash
#
# setup.sh
#
# Author: Gemini (Google AI)
#

set -euo pipefail

echo "[setup] Start unified environment bootstrap"

# ---------------------------
# 1) System & Tooling Bootstrap
# ---------------------------
has() { command -v "$1" >/dev/null 2>&1; }

if has apt-get; then
  echo "[setup] Apt bootstrap: Installing base packages..."
  if sudo apt-get update -y; then
    if ! sudo apt-get install -y --no-install-recommends curl ca-certificates gnupg git-lfs; then
      echo "[setup][warn] apt install failed, continuing without optional packages" >&2
    fi
  else
    echo "[setup][warn] apt update failed, skipping apt package installation" >&2
  fi
fi

# ---------------------------
# 2) Node.js & pnpm Environment
# ---------------------------
PNPM_VERSION="10.15.0"
NODE_MAJOR="22"
NVM_DIR="${HOME}/.nvm"

echo "[setup] Configuring Node.js v${NODE_MAJOR} via nvm..."
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

echo "[setup] Enabling Corepack and preparing pnpm@${PNPM_VERSION}..."
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
  echo "[setup] Installing uv..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi
export PATH="$HOME/.local/bin:$PATH"

echo "[setup] Installing Python ${UV_PY_VERSION} via uv..."
uv python install "${UV_PY_VERSION}"
UV_PY_PATH="$(uv python find "${UV_PY_VERSION}")"
export UV_PYTHON="${UV_PY_PATH}"

# ---------------------------
# 4) Application & Docs Dependencies
# ---------------------------

# Install Frontend Dependencies
if [ -f "frontend/package.json" ]; then
  echo "[setup] Frontend detected, installing dependencies..."
  if [ ! -f frontend/.npmrc ]; then
    printf "registry=https://registry.npmjs.org/\nalways-auth=false\n" > frontend/.npmrc
  fi
  if ! pnpm -C frontend install --frozen-lockfile; then
    echo "[setup][warn] pnpm install failed, retrying without lifecycle scripts" >&2
    if pnpm -C frontend install --frozen-lockfile --ignore-scripts; then
      echo "[setup] Manually replaying skipped frontend lifecycle scripts..."
      if ! (cd frontend && node scripts/check-versions.js); then
        echo "[setup][warn] frontend version check failed" >&2
      fi
      if ! pnpm -C frontend run --filter @rotki/common build; then
        echo "[setup][warn] failed to build @rotki/common" >&2
      fi
      if ! pnpm -C frontend run --filter rotki postinstall; then
        echo "[setup][warn] frontend postinstall failed" >&2
      fi
    else
      echo "[setup][error] pnpm install failed even when ignoring scripts" >&2
      exit 1
    fi
  fi
fi

# Install Python Docs Dependencies
echo "[setup] Configuring Python docs toolchain..."
# Use the globally active python for this, as it's a toolchain setup
if ! python -m pip install --upgrade pip; then
  echo "[setup][warn] pip upgrade failed; continuing with existing version" >&2
fi
if [ -f docs/requirements.txt ]; then
  if ! python -m pip install -r docs/requirements.txt; then
    echo "[setup][warn] docs requirements installation failed" >&2
  fi
else
  if ! python -m pip install "sphinx>=7" myst-parser sphinx-rtd-theme; then
    echo "[setup][warn] default docs dependencies installation failed" >&2
  fi
fi
if has apt-get; then
  (sudo apt-get install -y --no-install-recommends graphviz) || echo "[warn] Skipping optional graphviz install"
fi

# ---------------------------
# 5) Final Verification & Smoke Tests
# ---------------------------
echo "[verify] Running final verification and smoke tests..."

if has git-lfs; then
  echo "[verify] Fetching Git LFS objects..."
  git lfs fetch --all
  git lfs checkout
fi

echo "[verify] Checking tool versions..."
echo "  - node: $(node -v)"
echo "  - pnpm: $(pnpm --version)"
echo "  - uv: $(uv --version)"
echo "  - sphinx: $(python -m sphinx --version)"

echo "[verify] Running isolated Python smoke test via uv..."
if [ -n "${UV_PYTHON:-}" ]; then
  # This is the critical command. `--no-project` prevents `uv` from trying to
  # resolve project dependencies and hitting the GitHub API rate limit.
  uv run --no-project --python "${UV_PYTHON}" -- python -c "import sys; print(f'✅ Python smoke test PASSED. Version: {sys.version.split()[0]}')"
else
  echo "❌ CRITICAL: Could not run Python smoke test, UV_PYTHON was not set." >&2
  exit 1
fi

echo "[setup] ✅ Done! Environment is ready. ✨"
```

## Setup Script Gotchas

- The `uv run --no-project` flag in the smoke test prevents `uv` from traversing project dependencies and avoids GitHub API rate limits that otherwise surface as 403 errors during verification.
- The script intentionally combines setup and maintenance paths so that assistants only need to touch a single entry point; make sure any future edits preserve that single-script flow.
- Before shipping an update, review this list and the repository-level `AGENTS.md` to catch regressions or missing steps before publishing a new script.

## Update Protocol for Assistants

When a user asks for changes to the setup script:

1. Draft the updated script and run it inside the active workspace to ensure it finishes successfully and prepares the ChatGPT Codex environment as expected. Capture logs for review.
2. Once the smoke test is green, replace the script block above with the new version.
3. In the pull request summary or comments, include a copy-ready link to the raw Markdown file. Use `https://raw.githubusercontent.com/rotki/rotki/<branch>/CHATGPT_CODEX_ENV.md?plain=1` (substitute `<branch>` with the PR branch name) so maintainers can copy the script without Markdown delimiters.
4. Call out in the PR description that the maintainer must paste the script into the ChatGPT Codex environment settings and re-run the built-in interactive terminal to verify it.

## Maintainer Checklist

Maintainers should follow the steps below after receiving a script update:

1. Open the raw link shared in the PR, copy the script, and paste it into the ChatGPT Codex Rotki environment's **Setup script** field.
2. Connect the environment's interactive terminal to execute the script and ensure it completes successfully.
3. Save the updated script in the ChatGPT Codex environment settings and confirm it persisted by refreshing the settings page.
4. Merge the pull request only after the manual verification succeeds.

If additional automation (such as a GitHub Action that surfaces the script content) is needed, coordinate with the repository maintainers before merging.

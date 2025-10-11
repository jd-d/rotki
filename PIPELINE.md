# PIPELINE.md — Rotki Dev & Build (WSL)

> Doc-aligned local pipeline for fast iteration on **rotki** using WSL.  
> Defaults match the project docs; WSL notes are clearly marked.

## Contents
- [0) One-time setup](#0-one-time-setup)
- [1) Default dev (docs) — single process](#1-default-dev-docs--single-process)
- [2) Optional dev — dual terminal (you control backend)](#2-optional-dev--dual-terminal-you-control-backend)
- [3) Tests (doc-aligned)](#3-tests-doc-aligned)
- [4) Build / package (doc-aligned)](#4-build--package-doc-aligned)
- [5) Minimal Makefile helpers (optional)](#5-minimal-makefile-helpers-optional)
- [6) Troubleshooting](#6-troubleshooting)
- [7) Optional: Codex workflow](#7-optional-codex-workflow)
- [8) Git workflow extras](#8-git-workflow-extras)

---

## Codex working modes

- `Codex CLI (local workspace)` runs inside this checkout and is used for day-to-day development, builds, local tests, and actually launching rotki. It can read uncommitted files such as this pipeline.
- `ChatGPT/GitHub sandbox` operates on temporary branches fetched from GitHub and is only used for code edits and automated tests. It never sees untracked files or your local environment.

> **Note:** keep this document free of secrets or credentials. Treat it as shared operational guidance that both environments may rely on. High-level mod objectives live in `TODO.md`.

---

## 0) One-time setup

**WSL Ubuntu base**
```bash
sudo apt update && sudo apt upgrade -y
```

**Node 22 + pnpm via Corepack (frontend)**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 22 && nvm use 22
corepack enable
corepack prepare pnpm@10.15.0 --activate  # matches frontend/package.json "packageManager"
```

**Python env with uv (backend)**
```bash
cd ~/github-wsl/rotki
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync     # docs baseline (no extra groups)
```

> **WSL GUI deps (Electron)**
```bash
sudo apt install -y libasound2 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2   libxcomposite1 libxrandr2 libxkbcommon0 libxdamage1 libxfixes3 libxrender1   libpango-1.0-0 libpangocairo-1.0-0 libgtk-3-0
```

> **Rust for colibri (if prompted)**
```bash
sudo apt remove -y rustc cargo && sudo apt autoremove -y
curl https://sh.rustup.rs -sSf | sh
source $HOME/.cargo/env
rustup update stable
```

---

## 1) Default dev (docs) — single process

Electron **spawns the backend** on doc ports:

- REST API → `127.0.0.1:4242`
- WebSockets → `127.0.0.1:4333`

```bash
cd ~/github-wsl/rotki
source .venv/bin/activate          # expose VIRTUAL_ENV
cd frontend
nvm use 22
corepack enable && corepack prepare pnpm@10.15.0 --activate
pnpm install --frozen-lockfile     # first time / when lock changes
pnpm run dev
```

> **Quick launch:** Once the steps above are done the first time, you can simply run `./run-dev-single.sh` from the repo root. It wraps the virtualenv activation, Node 22 switch, Corepack setup, dependency install (if needed), and `pnpm run dev` in one command.

If a red error page says the backend is already running, another process is bound to those ports; see [Troubleshooting](#6-troubleshooting).

---

## 2) Optional dev — dual terminal (you control backend)

Useful to restart/debug backend independently.

**Terminal A — backend (doc flags & ports)**
```bash
cd ~/github-wsl/rotki
uv run python -m rotkehlchen --api-port 4242 --websockets-port 4333
```

**Terminal B — frontend (UI only, do not spawn backend)**
- Make sure `frontend/.env.local` contains:
  ```
  ROTKI_BACKEND_DISABLED=true
  VITE_API_URL=http://127.0.0.1:4242
  ```
  Keep a second file (for example `.env.single`) without those overrides; copy whichever file you need into `.env.local` when switching modes.
- Then run:
  ```bash
  cd ~/github-wsl/rotki/frontend
  nvm use 22
  corepack enable && corepack prepare pnpm@10.15.0 --activate
  pnpm run dev
  ```

> **Quick launch:** Use `./run-dev-dual.sh backend` for Terminal A and `./run-dev-dual.sh frontend` for Terminal B. The script exports the required environment variables and installs dependencies on-demand.

**Switching modes quickly**
- To let the frontend spawn the backend again, rename or delete `frontend/.env.local`, or set `ROTKI_BACKEND_DISABLED=false`.
- To return to dual-terminal mode, restore the overrides above and restart the backend/frontend pair.

---

## 3) Tests (doc-aligned)

```bash
# backend (gevent wrapper per docs)
cd ~/github-wsl/rotki
uv run python pytestgeventwrapper.py -q

# frontend (faster baseline)
cd frontend
pnpm run test:unit
```

---

## 4) Build / package (doc-aligned)

```bash
cd ~/github-wsl/rotki
uv sync --group packaging
uv run python ./package.py --build full
```

---

## 5) Minimal Makefile helpers (optional)

Append to the repo Makefile (uses doc ports/flags):

```make
API_PORT ?= 4242
WS_PORT  ?= 4333

.PHONY: dev dev-backend dev-frontend build test-backend test-frontend test

# docs default: Electron spawns backend
dev:
	. .venv/bin/activate && cd frontend && pnpm run dev

# optional: run backend yourself
dev-backend:
	uv run python -m rotkehlchen --api-port $(API_PORT) --websockets-port $(WS_PORT)

# optional: UI only (when backend is already running)
dev-frontend:
	. .venv/bin/activate && cd frontend && pnpm run dev

test-backend:
	uv run python pytestgeventwrapper.py -q

test-frontend:
	cd frontend && pnpm run test:unit

test: test-backend test-frontend

build:
	uv sync --group packaging
	uv run python ./package.py --build full
```

---

## 6) Troubleshooting

**Port in use (4242/4333)**
```bash
ss -lptn 'sport = :4242' 'sport = :4333'
sudo lsof -i :4242 :4333
kill -TERM <PID>  # or -KILL if needed
```
Temporarily switch:
```bash
uv run python -m rotkehlchen --api-port 5081 --websockets-port 5082
echo "VITE_API_URL=http://127.0.0.1:5081" >> frontend/.env.local
```

**Frontend says “No python virtual environment detected”**  
Run from a shell where you did `source .venv/bin/activate` at the repo root **before** `pnpm run dev`.

**Electron missing libs**  
Install the WSL GUI deps listed above.

**Cargo lock v4 error**  
Install Rust via rustup (see setup).

---

## 7) Optional: Codex workflow

Your local productivity layer—use standard PR flow for contributions.

```bash
cd ~/github-wsl/rotki
git checkout -b feat/my-change
git add -A && git commit -m "baseline before codex"
codex edit . --approval=ask
git diff && git add -p && git commit -m "codex: implement X"
```

---

*Last updated: 2025-10-08.*

## 8) Git workflow extras

- See `PIPELINE_FOR_GIT.md` (in the repo root) for a hands-on rebasing pipeline tailored to keeping a long-lived `mod` branch synced with `upstream/develop`. It includes command sequences, conflict-resolution tips, and diagrams.

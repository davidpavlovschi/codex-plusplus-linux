#!/usr/bin/env bash
set -euo pipefail

REPO="${CODEX_PLUSPLUS_LINUX_REPO:-github:davidpavlovschi/codex-plusplus-linux}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ is required. Install Node.js first, then rerun this script." >&2
  exit 1
fi

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$node_major" -lt 20 ]; then
  echo "Node.js 20+ is required. Found: $(node --version)" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install npm first, then rerun this script." >&2
  exit 1
fi

if ! command -v tar >/dev/null 2>&1; then
  echo "tar is required. Install tar first, then rerun this script." >&2
  exit 1
fi

npm install -g "$REPO"
codex-plusplus-linux install "$@"

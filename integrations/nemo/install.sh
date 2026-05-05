#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_HOME="${XDG_DATA_HOME:-"${HOME}/.local/share"}"
TARGET_DIR="${DATA_HOME}/nemo/actions"

mkdir -p "${TARGET_DIR}"

for action in "${SCRIPT_DIR}"/*.nemo_action; do
  install -m 0644 "${action}" "${TARGET_DIR}/$(basename "${action}")"
done

echo "Installed Nemo actions to ${TARGET_DIR}"
echo "Restart Nemo with: nemo -q"

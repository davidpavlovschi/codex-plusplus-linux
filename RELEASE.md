# Release Guide

## Build Locally

```sh
npm install
node --check lib/cli.js
scripts/build-deb.sh
dpkg-deb --info dist/codex-plusplus-linux_0.2.0_amd64.deb
```

## Smoke Test

```sh
sudo apt install ./dist/codex-plusplus-linux_0.2.0_amd64.deb
codex-plusplus-linux doctor
codex-plusplus-linux launch
```

Confirm:

- `Codex++ Linux` appears in the app menu.
- Cinnamon/Linux Mint pins it to the bottom panel when available.
- `~/.local/share/codex-plusplus-linux/logs/launcher/latest.log` contains `Codex CLI initialized`.

## GitHub Release

Upload:

- `dist/codex-plusplus-linux_0.2.0_amd64.deb`

Suggested release notes:

```text
Initial Linux package for Codex++ Linux.

- Debian/Ubuntu/Mint .deb installer
- desktop launcher and icon
- Cinnamon panel pinning
- Codex CLI + codex-app-linux wrapper
- Codex++ install, repair, logs, and doctor commands
```

# Contributing

Thanks for helping improve Codex++ Linux for Linux users.

## Good First Contributions

- Test the `.deb` on another Debian/Ubuntu-based distribution.
- Add screenshots under `docs/screenshots/`.
- Improve desktop integration for KDE Plasma, GNOME, XFCE, or MATE.
- Add AppImage packaging.
- Add ARM64 Linux support if the upstream runtime stack supports it.
- Improve diagnostics in `codex-plusplus-linux doctor`.

## Development Setup

```sh
git clone https://github.com/davidpavlovschi/codex-plusplus-linux.git
cd codex-plusplus-linux
npm install
node --check lib/cli.js
npm install -g .
codex-plusplus-linux doctor
```

## Build A Package

```sh
scripts/build-deb.sh
sudo apt install ./dist/codex-plusplus-linux_0.1.1_amd64.deb
```

## Pull Request Checklist

- Keep changes Linux-focused and narrowly scoped.
- Run `node --check lib/cli.js`.
- Run `codex-plusplus-linux doctor` if the change touches launcher behavior.
- Rebuild the `.deb` if packaging files changed.
- Update `README.md` when install, use, or troubleshooting behavior changes.
- Preserve upstream attribution to OpenAI Codex, Codex++, and codex-app-linux.

## Upstream Respect

This project wraps upstream work. Bugs that clearly belong upstream should be reported upstream with useful reproduction steps. Bugs in our installer, launcher, icons, panel pinning, docs, or Debian packaging belong here.

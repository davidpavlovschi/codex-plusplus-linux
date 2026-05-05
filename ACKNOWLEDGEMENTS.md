# Acknowledgements

Codex++ Linux is a packaging and launcher project that depends on several upstream projects. Please star, support, and contribute upstream where possible.

## OpenAI Codex

- Repository: https://github.com/openai/codex
- Role in this project: provides the `@openai/codex` package, Codex CLI, and local app-server runtime used by the desktop app.
- Citation: OpenAI describes the repository as a lightweight coding agent that runs in the terminal.

OpenAI Codex is not bundled as this project's own work. It is used as an upstream dependency.

## Codex++

- Repository: https://github.com/b-nnett/codex-plusplus
- Author/maintainer: b-nnett and contributors
- License: MIT
- Role in this project: provides the Codex desktop tweak system, runtime, patcher, watcher, and tweak-management behavior.
- Citation: Codex++ describes itself as a tweak system for the Codex desktop app that injects custom features, fixes UI bugs, and adds a tweak manager without rebuilding the app.

Codex++ Linux exists mainly to make this work easier to install and launch on Linux desktops.

## codex-app-linux

- Repository: https://github.com/better-slop/codex-app-linux
- Author/maintainer: better-slop and contributors
- Role in this project: provides the unofficial Linux desktop shell and packaging bridge for the Codex app.
- Citation: the upstream project describes itself as an unofficial Codex App for Linux with npm, AUR, and Nix packaging support.

## Linux Desktop Components

This project also relies on standard Linux desktop infrastructure:

- Debian package tooling: `dpkg-deb`, `fakeroot`
- freedesktop `.desktop` launchers
- hicolor icon theme paths
- `desktop-file-utils`
- GTK icon cache tooling
- systemd user services
- Cinnamon `favorite-apps` settings for Linux Mint panel pinning
- a small original Linux-inspired badge asset bundled with this project

## Project Authors

- Doved: project owner and Linux packaging maintainer.
- OpenAI Codex: co-authoring assistant for the initial Linux wrapper, packaging scripts, documentation, and validation.

Doved on X: https://x.com/real_doved

## Trademark Notice

OpenAI, Codex, Linux, Debian, Ubuntu, Linux Mint, and other names may be trademarks of their respective owners. Their use here is descriptive and does not imply endorsement.

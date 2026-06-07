# Changelog

## Unreleased

- Document the Codex++ upstream sync state at `b-nnett/codex-plusplus@f98e7e9`.
- Clarify that Codex++ Linux tracks upstream compatibility without merging unrelated source history.

## 0.2.0

- Add local right-edge panel API daemon on `127.0.0.1:17654`.
- Add panel status JSON with health, recent projects, sessions, actions, and usage.
- Add local token usage aggregation and API-equivalent USD estimates.
- Add `codex-here`, `open`, `ask-file`, `explain-log`, `generate-readme`, `ask-active-window`, and `ask-clipboard` commands.
- Add Nemo file manager actions for Linux Mint/Cinnamon.
- Install a user systemd service for the panel daemon from the Debian package.

## 0.1.1

- Add bundled `Codex Linux Badge` tweak.
- Install bundled tweaks into the Codex++ tweaks directory during setup.
- Document the in-app Linux identity badge.

## 0.1.0

Initial public release.

- Debian/Ubuntu/Linux Mint `.deb` package
- desktop launcher and hicolor icon installation
- Cinnamon/Linux Mint panel favorite pinning
- bundled `Codex Linux Badge` tweak inside the app UI
- `codex-plusplus-linux` and `codex++` commands
- install, launch, repair, logs, doctor, and uninstall commands
- Codex CLI dependency through `@openai/codex`
- Linux desktop shell dependency through `codex-app-linux`
- Codex++ integration and repair watcher support

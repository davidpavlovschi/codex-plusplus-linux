# Codex++ Linux

![Linux](https://img.shields.io/badge/Linux-x86__64-FCC624?logo=linux&logoColor=111111)
![Debian package](https://img.shields.io/badge/package-.deb-A81D33?logo=debian&logoColor=white)
![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

Codex++ Linux is an unofficial Linux installer and launcher for the OpenAI Codex desktop app experience with Codex++ tweaks enabled.

It packages the Linux setup into a normal desktop app: an installable `.deb`, a launcher icon, a Cinnamon panel favorite on Linux Mint, terminal commands, health checks, logs, and repair commands.

> This project is unofficial. It is not affiliated with OpenAI, b-nnett, Codex++, or better-slop.

## What This Does

Codex++ Linux glues together three upstream projects:

- [OpenAI Codex](https://github.com/openai/codex): the Codex CLI and local app-server runtime.
- [Codex++](https://github.com/b-nnett/codex-plusplus): the tweak system that patches the Codex desktop app and loads user tweaks.
- [codex-app-linux](https://github.com/better-slop/codex-app-linux): the unofficial Linux desktop shell and packaging bridge for the Codex app.

This repo adds the Linux user experience around those pieces:

- installable Debian package for Ubuntu, Debian, Linux Mint, Pop!_OS, Zorin, and similar distributions
- `Codex++ Linux` desktop launcher
- panel pinning for Cinnamon/Linux Mint
- installed icon assets
- `codex-plusplus-linux` and `codex++` terminal commands
- first-run install, launch, repair, logs, and doctor commands
- per-user logs under `~/.local/share/codex-plusplus-linux`

## Screenshots

Add screenshots before publishing the first release:

- app menu entry for `Codex++ Linux`
- Cinnamon panel icon
- first app launch
- Codex++ tweaks/settings screen

Suggested paths:

```text
docs/screenshots/menu.png
docs/screenshots/panel.png
docs/screenshots/app.png
```

## Supported Systems

Tested target:

- Linux Mint 22.1 Cinnamon
- Linux x86_64
- Node.js 20+

Expected to work on:

- Ubuntu 24.04+
- Debian-based distributions with Node.js 20+
- other x86_64 Linux desktops that support freedesktop `.desktop` launchers

Not currently supported:

- ARM Linux
- Flatpak/Snap packaging
- AppImage packaging
- Wayland-specific fixes beyond what upstream Electron/Codex support

## Install From The `.deb`

Download the latest `.deb` from GitHub Releases, then install it:

```sh
sudo apt install ./codex-plusplus-linux_0.1.0_amd64.deb
```

Then run:

```sh
codex-plusplus-linux install
```

Open the app from your launcher:

```text
Codex++ Linux
```

On Cinnamon/Linux Mint, the installer also tries to pin `Codex++ Linux` to the bottom panel favorites.

## Install From Source

```sh
git clone https://github.com/davidpavlovschi/codex-plusplus-linux.git
cd codex-plusplus-linux
npm install
npm install -g .
codex-plusplus-linux install
```

Replace the GitHub owner if you publish under a different account or organization.

## Build The `.deb`

```sh
npm install
scripts/build-deb.sh
```

The package is written to:

```text
dist/codex-plusplus-linux_0.1.0_amd64.deb
```

## Use The App

Launch from the desktop:

```text
Codex++ Linux
```

Launch from terminal:

```sh
codex-plusplus-linux launch
```

Short alias:

```sh
codex++ launch
```

## Health Check

```sh
codex-plusplus-linux doctor
```

The doctor checks:

- Node.js, npm, and tar
- bundled Codex CLI
- `codex-app-linux`
- downloaded Codex desktop shell
- desktop launcher and icon
- Codex++ patch state
- Codex++ watcher state

## Logs

Print log locations:

```sh
codex-plusplus-linux logs
```

Main launcher log:

```text
~/.local/share/codex-plusplus-linux/logs/launcher/latest.log
```

Codex++ runtime logs:

```text
~/.local/share/codex-plusplus/log/main.log
~/.local/share/codex-plusplus/log/preload.log
```

Watcher logs:

```sh
journalctl --user -u codex-plusplus-watcher.service -n 100 --no-pager
```

## Repair

If a Codex app update removes the patch or the tweaks disappear:

```sh
codex-plusplus-linux repair
```

Codex++ also installs a watcher that normally reapplies the patch automatically.

## Uninstall

Remove the desktop integration and ask Codex++ to uninstall its patch:

```sh
codex-plusplus-linux uninstall
```

Remove the Debian package:

```sh
sudo apt remove codex-plusplus-linux
```

If installed globally through npm:

```sh
npm uninstall -g codex-plusplus-linux
```

This does not delete your OpenAI/Codex account data, Codex CLI config, or unrelated `~/.codex` files.

## Important Paths

Wrapper state:

```text
~/.local/share/codex-plusplus-linux
```

Codex++ data and tweaks:

```text
~/.local/share/codex-plusplus
~/.local/share/codex-plusplus/tweaks
```

Downloaded Linux desktop bundle:

```text
~/.cache/codex-app-linux/<version>/linux-unpacked
```

System package install:

```text
/opt/codex-plusplus-linux
/usr/bin/codex-plusplus-linux
/usr/share/applications/codex-plusplus-linux.desktop
/usr/share/icons/hicolor
```

## Current Linux Notes

This installer disables Codex++ self-update in:

```text
~/.local/share/codex-plusplus/config.json
```

The Codex++ repair watcher remains enabled. Self-update is disabled because the upstream updater can fail on Linux when moving staged updates from `/tmp` into `$HOME` across filesystems. Repairing the app patch still works.

The desktop shell may print GTK/appmenu warnings, Electron protocol-handler warnings, or unsupported feature messages. Those are currently non-fatal. The important checks are `codex-plusplus-linux doctor` and the launcher log showing `Codex CLI initialized`.

## Credits

This project exists because of upstream work:

- OpenAI for [openai/codex](https://github.com/openai/codex), the Codex CLI and app-server runtime used by the desktop app.
- b-nnett and contributors for [codex-plusplus](https://github.com/b-nnett/codex-plusplus), the tweak system that makes the Codex desktop app extensible.
- better-slop and contributors for [codex-app-linux](https://github.com/better-slop/codex-app-linux), the unofficial Linux Codex app packaging bridge.
- The Linux desktop ecosystem: freedesktop.org launchers, Debian packaging, hicolor icons, systemd user services, and Cinnamon/Linux Mint panel integration.

## Authors

- Doved, project owner and Linux packaging maintainer.
- OpenAI Codex, co-authoring assistant for the initial Linux wrapper, docs, packaging, and validation work.

Follow Doved on X: [@real_doved](https://x.com/real_doved)

## Legal

Codex++ Linux is a wrapper/installer. It does not claim ownership of OpenAI Codex, Codex++, or codex-app-linux.

OpenAI, Codex, and related marks belong to their respective owners. This project is unofficial and provided without warranty. Use it at your own risk.

See [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md) for detailed upstream citations.

## License

MIT. See [LICENSE](LICENSE).

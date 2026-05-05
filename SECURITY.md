# Security Policy

Codex++ Linux patches and launches a local desktop app that can run Codex tooling on your machine. Treat it with the same care as any developer tool that can read and modify project files.

## Supported Versions

Security fixes target the latest release only until the project grows enough to maintain multiple branches.

## Reporting A Vulnerability

Open a private security advisory on GitHub if available. If not, open an issue with a minimal description and ask for a secure contact path before posting exploit details.

## Scope

In scope for this repository:

- unsafe installer or launcher behavior
- insecure file permissions introduced by this wrapper
- desktop launcher issues that execute the wrong command
- package scripts that run unexpected commands
- logging of sensitive data by this wrapper

Out of scope for this repository:

- vulnerabilities in OpenAI Codex itself
- vulnerabilities in Codex++
- vulnerabilities in codex-app-linux
- vulnerabilities in Electron, Node.js, npm, or Linux desktop environments

Please report upstream issues to the relevant upstream project.

## Local Trust Model

Codex++ Linux installs per-user configuration and logs under `~/.local/share`. The Debian package installs launcher code under `/opt/codex-plusplus-linux` and commands under `/usr/bin`.

Do not install `.deb` files from people you do not trust. Review release checksums and source diffs before installing.

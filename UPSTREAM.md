# Upstream Sync

Codex++ Linux is not a fork of Codex++. It is a Linux packaging and launcher wrapper around OpenAI Codex, Codex++, and codex-app-linux.

## Current Upstream Check

- Upstream repository: https://github.com/b-nnett/codex-plusplus
- Upstream branch: `main`
- Upstream ref: `f98e7e9d1fa068dde9e0dddfb43b128acb4e2fd7`
- Upstream commit title: `Merge codex/1.0.0`
- Checked on: 2026-06-07

## VPS Remote

The VPS checkout has an `upstream` remote pointing at:

```sh
git remote add upstream https://github.com/b-nnett/codex-plusplus.git
```

Fetch branch state without importing upstream tags, because this package has its own release tags:

```sh
git fetch upstream main --prune
```

## Sync Rule

Review upstream behavior and compatibility notes, then update this wrapper's docs, installer assumptions, diagnostics, or tests as needed. Do not merge `upstream/main` into this repo: the histories are unrelated and the projects own different source surfaces.

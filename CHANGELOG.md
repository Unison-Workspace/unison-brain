# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- `unison --version` now reports the real package version (read from
  `package.json` at runtime) instead of a hardcoded string that drifted out of
  sync with the published release.

## [0.1.0] - 2026-05-23

First public release: the open-source client (SDK, CLI, MCP server, and Agent
Skill) for the hosted Unison brain at `https://api.unisonlabs.ai`.

### Added

- `@unisonlabs/sdk` — typed client covering the full brain surface (documents,
  entities, facts, links, dedup review, jobs, status) plus PKCE and device-flow
  auth helpers.
- `@unisonlabs/cli` — the `unison` command: `auth login` (browser PKCE loopback,
  `--device` fallback, `--with-token` for CI), `search`, `grep`, `get`, `ls`,
  `write`, `rm`, `tag`, `share`, `neighbors`, `links`, `link`, `entity *`,
  `fact *`, `timeline`, `review *`, `jobs *`, `status`.
- `@unisonlabs/mcp` — MCP server exposing 8 curated brain tools.
- Filesystem navigation: `ls` (directory view by default, `--docs` for titles),
  `tree`, `find` (path glob), `cat` (alias of `get`).
- `unison skill install` — installs the Agent Skill into `~/.claude/skills/`.
- `unison completion <bash|zsh|fish>` — shell completion scripts.
- Confirmation prompts on destructive commands (`--yes` to skip; refuses in
  non-interactive shells without `--yes`).
- Actionable error hints (e.g. 401 → run `unison auth login`).

### Agent ergonomics

- Result data on **stdout**, status/progress on **stderr** (clean piping).
- Errors are a JSON envelope on stderr under `--json` (or `OUTPUT_FORMAT=json`),
  with `code` / `message` / `status` / `suggestedFix`.
- Distinct **exit codes**: 0 ok, 1 error, 3 not found, 4 auth, 5 conflict.
- JSON auto-compacts when piped (pretty on a TTY) to save agent tokens.
- `--help` documents `--json`, env vars, exit codes, and usage examples.

[Unreleased]: https://github.com/Unison-Workspace/unison-brain/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Unison-Workspace/unison-brain/releases/tag/v0.1.0

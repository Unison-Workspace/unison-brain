# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `@unisonlabs/sdk` — typed client covering the full brain surface (documents,
  entities, facts, links, dedup review, jobs, status) plus PKCE and device-flow
  auth helpers.
- `@unisonlabs/cli` — the `unison` command: `auth login` (browser PKCE loopback,
  `--device` fallback, `--with-token` for CI), `search`, `grep`, `get`, `ls`,
  `write`, `rm`, `tag`, `share`, `neighbors`, `links`, `link`, `entity *`,
  `fact *`, `timeline`, `review *`, `jobs *`, `status`.
- `@unisonlabs/mcp` — MCP server exposing 8 curated brain tools.
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

[Unreleased]: https://github.com/Unison-Workspace/unison-brain/commits/main

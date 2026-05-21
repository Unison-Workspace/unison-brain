# Contributing to Unison Brain

Thanks for helping improve the open-source client for the Unison brain.

## Repo layout

This is a [Bun](https://bun.sh) workspace monorepo:

- `packages/sdk` — `@unison/sdk`, the typed HTTP client (the core).
- `packages/cli` — `@unison/cli`, the `unison` command (bundles the SDK).
- `packages/mcp` — `@unison/mcp`, the Model Context Protocol server.
- `skill/SKILL.md` — the drop-in Agent Skill.
- `SPEC.md` — the backend API contract this client targets (implemented elsewhere).

## Development

```bash
bun install
bun test          # unit tests (SDK + CLI)
bun lint          # Biome (lint + format check)
bun run lint:fix  # auto-fix
bun run build     # bundle each package to dist/
bun run packages/cli/src/index.ts --help   # run the CLI from source
```

## Before opening a PR

1. `bun lint` and `bun test` must pass (CI runs both plus `bun run build`).
2. Keep changes scoped; one logical change per PR.
3. Update `CHANGELOG.md` under "Unreleased".
4. If you change `skill/SKILL.md`, run `bun run build` so the embedded copy used by
   `unison skill install` is regenerated.

## Conventions

- TypeScript, ESM, Biome formatting (tabs, double quotes, 100 cols — see `biome.json`).
- The SDK has zero runtime dependencies; keep it that way.
- Human-readable CLI output goes to **stderr**; machine data (and `--json`) goes to
  **stdout**, so piping stays clean.
- The client never enforces auth/permissions — the server is the boundary. Don't add
  client-side scope or path checks.

## Reporting bugs / proposing features

Use the issue templates. For security issues, see [`SECURITY.md`](./SECURITY.md) —
do **not** open a public issue.

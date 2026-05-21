# AGENTS.md

Guidance for AI agents working in this repo (and using the tool it ships).
Follows the [AGENTS.md](https://agents.md/) convention. Human contributors: see
[`CONTRIBUTING.md`](./CONTRIBUTING.md).

## What this is

The open-source client for the **Unison brain** — a hosted, path-addressable
knowledge base (documents + a knowledge graph of entities and bitemporal facts).
This repo is a Bun workspace with three published packages and a drop-in skill:

- `packages/sdk` — `@unisonlabs/sdk`, the typed HTTP client (the core; zero runtime deps).
- `packages/cli` — `@unisonlabs/cli`, the `unison` command (bundles the SDK).
- `packages/mcp` — `@unisonlabs/mcp`, the Model Context Protocol server.
- `skill/SKILL.md` — the Agent Skill that teaches an agent to drive the CLI.
- `SPEC.md` — the backend REST contract this client targets (implemented elsewhere).

## Build, test, lint (run before every PR)

```bash
bun install
bun test            # unit tests (SDK + CLI)
bun lint            # Biome (lint + format check); `bun run lint:fix` to auto-fix
bun run build       # bundle each package to dist/
```

CI runs `bun lint`, `bun test`, `bun run build`. All three must pass.

## Conventions (do not break)

- TypeScript + ESM. Biome formatting: tabs, double quotes, 100 cols (`biome.json`).
- **The SDK has zero runtime dependencies.** Keep it that way.
- **The client enforces nothing** — the server is the only security boundary. Never
  add client-side scope checks, path allow-lists, or auth logic; send the request
  and surface the server's response.
- **Output discipline:** result data → stdout; status/progress/errors → stderr.
  Use `out()` for data, `info()/success()/fail()` for chatter (`packages/cli/src/output.ts`).
- `skill/SKILL.md` is the source of truth for the skill; `bun run build` regenerates
  the copy embedded in the CLI (`packages/cli/src/skill-content.ts` — generated, don't edit).

## Using the `unison` CLI itself (it's built for you)

```bash
unison search "<question>" --json     # results = JSON on stdout (compact when piped)
unison cat /wiki/architecture          # read a document (alias of get)
unison ls /wiki                        # directory view; tree / find for navigation
unison entity resolve "Daniel" --json  # graph lookup → fact ls --entity <id>
echo "..." | unison write /wiki/x      # writable tiers: /wiki/ /skills/ /actions/
```

- Pass `--json` for machine output. Errors are a JSON envelope on **stderr** with a
  nonzero exit code: `4` auth, `3` not found, `5` conflict, `1` other.
- Destructive commands (`rm`, `fact rm`, `review merge`) need `--yes` non-interactively.
- Auth: `unison auth login` (browser) or `UNISON_TOKEN=usk_...` for headless/CI.
- Run `unison --help` and `unison <cmd> --help` — the help is written to be read by an agent.

## PRs

One logical change per PR. Update `CHANGELOG.md` under "Unreleased". Never push to
`main` directly (it's protected — open a PR). Security issues: see [`SECURITY.md`](./SECURITY.md).

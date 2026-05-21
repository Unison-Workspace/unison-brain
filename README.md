# Unison Brain

[![CI](https://github.com/Unison-Workspace/unison-brain/actions/workflows/ci.yml/badge.svg)](https://github.com/Unison-Workspace/unison-brain/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Your cloud knowledge base, in any coding agent.**

The Unison brain is a hosted knowledge base — decisions, conventions,
architecture, prior solutions, people. This repo is the **open-source client**
for it: a CLI, an SDK, an MCP server, and an agent skill. No local database, no
local index — the brain lives in the cloud and is reachable from any machine or
agent with one command.

```bash
unison search "why did we pick device-flow auth"
```

This client is open source so you can read exactly what it sends before piping it
into a coding agent with shell access. The brain backend that stores and searches
your data is a separate, closed service; see [`SPEC.md`](./SPEC.md) for the API
contract this client speaks.

## What's in the box

| Package | Install as | What it is |
| --- | --- | --- |
| [`@unisonlabs/cli`](./packages/cli) | `unison` | The CLI: `search`, `get`, `write`, `list`, `status`, `auth`. |
| [`@unisonlabs/sdk`](./packages/sdk) | `@unisonlabs/sdk` | Typed HTTP client the CLI and MCP server are built on. |
| [`@unisonlabs/mcp`](./packages/mcp) | `unison-brain-mcp` | A Model Context Protocol server for agents without shell access. |
| [`skill/SKILL.md`](./skill/SKILL.md) | — | Drop-in [Agent Skill](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) that teaches an agent to use the CLI. |

The SDK is the core; the CLI and MCP server are thin wrappers over it, and the
skill wraps the CLI — one API contract, four surfaces.

## Quickstart

```bash
unison auth login                 # opens your browser to sign in
unison status                     # confirm you're connected
unison search "auth decision"     # search the brain
unison get /wiki/architecture.md  # read a document
echo "We chose X because Y." | unison write /wiki/x.md   # paths end in .md
unison entity resolve "Daniel"    # knowledge-graph lookup
unison fact ls --entity <id>      # facts about an entity
```

Documents: `search`, `grep`, `cat`/`get`, `ls`, `tree`, `find`, `write`, `rm`,
`tag`, `share`, `neighbors`, `links`, `link`. Graph: `entity …`, `fact …`,
`timeline`. Admin: `review …`, `jobs …`. Add `--json` to any command. Full
surface and the backend contract are in [`SPEC.md`](./SPEC.md).

## Browse the brain like a filesystem

The brain is path-addressable (`/wiki/`, `/sources/`, `/raw/`, `/system/`), so it
navigates with the commands you already know:

```bash
unison ls                       # entries at the root (dirs + files)
unison ls /wiki                 # entries under /wiki
unison ls /wiki --docs          # documents with titles instead of the dir view
unison tree /wiki               # recursive tree under /wiki
unison find '/wiki/**auth*'     # paths matching a glob
unison cat /wiki/architecture.md  # read a document (alias of `get`)
unison cat --raw '/system/...'  # read any tier, including synthetic ones
unison grep "TODO" --json       # regex scan over document bodies
```

## Query the knowledge graph

Beyond documents, the brain has entities (canonical people/projects/companies)
and bitemporal facts about them:

```bash
id=$(unison entity resolve "Daniel" --json | jq -r .entity.id)
unison fact ls --entity "$id"          # what the brain knows about Daniel
unison timeline "$id"                   # facts over time
unison fact add "$id" works_at "Joined Unison in 2026" --confidence 0.9
unison neighbors /wiki/architecture.md  # linked documents
```

## For coding agents

Pass `--json` for machine output: results are JSON on **stdout** (compact when
piped); errors are a JSON envelope on **stderr** with a nonzero exit code
(`4` auth, `3` not found, `5` conflict, `1` other). Destructive commands (`rm`,
`fact rm`, `review merge`) require `--yes` in non-interactive shells. Drop the
skill in with `unison skill install`, or run `unison --help` / `unison <cmd>
--help` — the help is written to be read by an agent.

```bash
unison search "rate limiting" -k 5 --json | jq '.[].doc.path'
unison get /wiki/architecture.md --json
```

## Authentication

`unison auth login` opens your browser to our sign-in page (PKCE loopback,
RFC 8252 + 7636) — the same one-command, no-credentials-in-the-terminal flow as
`gh auth login` / `vercel login`. Account creation happens in the browser; the CLI
just receives and stores the token at `~/.config/unison/config.json` (mode `0600`).
On a headless/SSH box, use `unison auth login --device` for the code-based flow.

For **CI and headless agents**, skip the browser — set an API key:

```bash
export UNISON_TOKEN="usk_live_..."   # overrides the stored credential
export UNISON_API_URL="https://api.unisonlabs.ai"   # optional, until prod is the default
```

`UNISON_TOKEN` always takes precedence over the stored file.

## Install

```bash
npm i -g @unisonlabs/cli      # or: pnpm add -g / bun add -g / npx @unisonlabs/cli
unison auth login         # sign in (opens your browser)
```

Distributed via npm as three packages: **`@unisonlabs/cli`** (the `unison` binary),
**`@unisonlabs/sdk`** (the typed client library), and **`@unisonlabs/mcp`** (the MCP
server). The published binaries are plain compiled JS with a
`#!/usr/bin/env node` shebang — they run on Node or Bun, no runtime to install.

## Use it from a coding agent

**Claude Code / Cursor / Codex (with a shell):** install the CLI, then install the
skill so the agent knows when and how to use the brain:

```bash
unison skill install      # writes the skill to ~/.claude/skills/unison-brain/
```

**Agents without a shell:** register the MCP server.

```json
{
  "mcpServers": {
    "unison-brain": {
      "command": "npx",
      "args": ["-y", "@unisonlabs/mcp"],
      "env": { "UNISON_TOKEN": "usk_live_...", "UNISON_API_URL": "https://api.unisonlabs.ai" }
    }
  }
}
```

## Shell completion

```bash
source <(unison completion bash)   # bash — add to ~/.bashrc
source <(unison completion zsh)    # zsh  — add to ~/.zshrc
unison completion fish > ~/.config/fish/completions/unison.fish
```

## SDK

```ts
import { BrainClient } from "@unisonlabs/sdk";
const brain = new BrainClient({ baseUrl: "https://api.unisonlabs.ai", token: process.env.UNISON_TOKEN });
const hits = await brain.search("auth decision", { limit: 5 });
```

See [`examples/`](./examples) for more.

## Development

Requires [Bun](https://bun.sh).

```bash
bun install
bun test                                    # unit tests (SDK + CLI)
bun lint                                     # Biome
bun run packages/cli/src/index.ts --help     # run the CLI from source
bun run build                                # bundle each package to dist/
node packages/cli/dist/index.js --help       # run the built (node) binary
```

This is a Bun workspace monorepo: `packages/*` resolve each other by name during
development. `bun run build` bundles the CLI and MCP server into self-contained
`dist/index.js` files (the SDK is bundled in; only npm deps stay external).

> **Note:** the brain endpoints (`SPEC.md`) are not live yet. Until then, point
> the client at a running backend with `UNISON_API_URL` / `UNISON_APP_URL` or
> `unison auth login --api-url <url>`.

## Contributing & security

Contributions welcome — see [`CONTRIBUTING.md`](./CONTRIBUTING.md) and the
[`CHANGELOG.md`](./CHANGELOG.md). Found a vulnerability? See
[`SECURITY.md`](./SECURITY.md) — please report privately, not via a public issue.

## License

MIT © Auraqu, Inc.

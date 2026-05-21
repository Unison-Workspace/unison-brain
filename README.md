# Unison Brain

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
| [`@unison/cli`](./packages/cli) | `unison` | The CLI: `search`, `get`, `write`, `list`, `status`, `auth`. |
| [`@unison/sdk`](./packages/sdk) | `@unison/sdk` | Typed HTTP client the CLI and MCP server are built on. |
| [`@unison/mcp`](./packages/mcp) | `unison-brain-mcp` | A Model Context Protocol server for agents without shell access. |
| [`skill/SKILL.md`](./skill/SKILL.md) | — | Drop-in [Agent Skill](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) that teaches an agent to use the CLI. |

The SDK is the core; the CLI and MCP server are thin wrappers over it, and the
skill wraps the CLI — one API contract, four surfaces.

## Quickstart

```bash
unison auth login                 # opens your browser to sign in
unison status                     # confirm you're connected
unison search "auth decision"     # search the brain
unison get /wiki/architecture     # read a document
echo "We chose X because Y." | unison write /wiki/x
unison entity resolve "Daniel"    # knowledge-graph lookup
unison fact ls --entity <id>      # facts about an entity
```

Documents: `search`, `grep`, `get`, `ls` (`--tree`), `write`, `rm`, `tag`,
`share`, `neighbors`, `links`, `link`. Graph: `entity …`, `fact …`, `timeline`.
Admin: `review …`, `jobs …`. Add `--json` to any command. Full surface and the
backend contract are in [`SPEC.md`](./SPEC.md).

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

## Use it from a coding agent

**Claude Code / Cursor / Codex (with a shell):** install the CLI and drop
[`skill/SKILL.md`](./skill/SKILL.md) into your skills directory. The agent calls
`unison` directly.

**Agents without a shell:** register the MCP server.

```json
{
  "mcpServers": {
    "unison-brain": {
      "command": "unison-brain-mcp",
      "env": { "UNISON_TOKEN": "usk_live_...", "UNISON_API_URL": "https://api.unisonlabs.ai" }
    }
  }
}
```

## Install

```bash
npm i -g @unison/cli      # or: pnpm add -g / bun add -g / npx @unison/cli
```

Distributed via npm. The published binary is plain compiled JS with a
`#!/usr/bin/env node` shebang, so it runs on Node or Bun — no runtime to install.

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

## License

MIT © Auraqu, Inc.

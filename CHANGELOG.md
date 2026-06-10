# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`brain.context()`** (SDK): one-call recall — `GET /v1/brain/context?q&mode&k&maxEntities`.
  Returns `ContextResult` with `hits`, `entities`, and a prompt-ready `contextMd` block.
  The brain does NO answer generation; pass `contextMd` verbatim into your LLM's prompt.
  Scope: `brain:read`.

- **`brain.ingest()`** (SDK): batch memory ingestion — `POST /v1/brain/ingest`.
  Accepts up to 100 conversation or document items per call. Conversations are routed
  through the signal-extraction pipeline (entity resolution + fact extraction). Documents
  land as extractable notes. Scope: `brain:write`.

- **`brain.writeDocs(docs[])`** (SDK): batch document write — `PUT /v1/brain/docs`.
  Single round-trip equivalent of calling `write()` on each document. Scope: `brain:write`.

- **`brain.patchDocMeta()`** (SDK): metadata-only `PATCH /v1/brain/doc` — update `title`,
  `tldr`, or `tags` without touching the body. Complement to `editDoc()` (body edits).
  Scope: `brain:write`.

- **`unison context "<query>" [--deep] [-k N] [--max-entities N] [--json]`** (CLI):
  prints `contextMd` by default; `--json` for the full structured response; `--deep`
  activates multi-hop graph expansion.

- **`unison ingest [--file <path>] [--conversation <json>] [--source-ref <ref>] [--visibility tenant|private]`**
  (CLI): ingest a markdown file as a document (`--file`) or a conversation JSON array of
  `{role,content}` turns (`--conversation` or stdin). Scope: `brain:write`.

- **`brain_context`** (MCP): wraps `brain.context()`. Description emphasises: use this
  BEFORE answering any question that may depend on the user's/team's history — pass
  `contextMd` verbatim into your prompt.

- **`brain_ingest`** (MCP): wraps `brain.ingest()`. Accepts `conversation` and `document`
  items via a discriminated-union `items[]` array.

- **`brain_search` `pathPrefix` param** (MCP + SDK): `GET /v1/brain/search` now accepts a
  `pathPrefix` query param to restrict results to documents under a given path.

- New types exported from `@unisonlabs/sdk`: `ContextOptions`, `ContextResult`,
  `ContextMode`, `SemanticHit`, `ContextEntity`, `IngestInput`, `IngestItem`,
  `IngestConversationItem`, `IngestDocumentItem`, `IngestResult`, `IngestItemResult`,
  `ConversationTurn`, `WriteDocInput`, `WriteDocsResult`, `EditDocMetaInput`.

## [1.2.0]

### Added

- **Scoped device-code login.** `startDeviceAuth(baseUrl, { scopes }, fetchImpl?)`
  (SDK) now forwards the requested scopes to `/v1/auth/device/code` as a
  space-joined `scope` field, and the `unison auth login --device` flow requests
  the same scope set as the browser loopback flow. Previously the device flow
  sent no scopes, so headless logins were silently limited to the server's
  brain-only default and couldn't reach `work` / `chat` / `agent`. The server
  clamps every minted key to the approving user's role, so requesting the full
  set is safe.

## [1.0.0]

**Breaking change.** The server collapsed `/v1/tasks`, `/v1/workspace`, and
`/v1/crm` into a single `/v1/work` surface with an operation-DSL apply endpoint.
This release tracks that change: the `tasks`, `workspace`, and `crm` domains are
**removed** (no compat alias — they would 404 against a current server) and a new
`work` domain replaces them. Pin `@unisonlabs/sdk@^0.2` if you still talk to a
pre-`/v1/work` server.

### Removed

- `u.tasks.*`, `u.workspace.*`, `u.crm.*` (SDK); the `tasks`, `crm`, and
  `workspace` CLI command groups; and the `tasks_*` / `workspace_*` / `crm_*`
  MCP tools. All of `/v1/tasks/*`, `/v1/workspace/*`, and `/v1/crm/*` are gone.

### Added

- **`u.work.*`** (SDK): `apply({ operations, dryRun? })` — the one write entry
  point, taking the canonical operation DSL — plus `query`, `search`, `inspect`,
  `tree`, `folder`, `artifact`, `tableSchema`, `viewQuery`, and
  `assets.upload / create / readUrl`. Operation types ship as
  `WorkOperation` (a snapshot of the server's `@unison/agent-shared` schemas).
- **`unison work`** CLI: `apply`, `query`, `search`, `inspect`, `tree`,
  `folder`, `artifact`, `table`, `view`.
- **`work_apply` / `work_query` / `work_search` / `work_inspect` / `work_tree` /
  `work_folder` / `work_artifact`** MCP tools (a focused set — `work_apply`
  takes the op DSL directly rather than fanning out 47 per-op tools).
- **Surgical editing**: `u.brain.editDoc({ path, oldStr, newStr })` (SDK — an
  atomic server-side `str_replace` via `PATCH /brain/doc`, matched + applied in
  one transaction with a uniqueness check, matching Claude Code's `Edit`
  semantics), the `unison edit <path> --old … --new …` CLI command, and the
  `brain_edit` MCP tool.
- **Web search**: `u.research.search(query)` (SDK), `unison web-search <query>`
  (CLI), and the `web_search` MCP tool — a server-side proxy that is the
  client's route to the open web.
- **FS-contract write routing**: `client.write` now routes through the brain FS
  contract — a bare or unqualified `*.md` write lands in `/private/notes/<slug>.md`,
  and a non-contract namespace (legacy `/wiki/`, `/actions/`, `/skills/`, …)
  fails fast with a clear message before the round-trip. The server's
  `checkWritable` remains authoritative. Exported as `routeBrainWritePath` /
  `WRITABLE_BRAIN_ROOTS` / `BrainContractError`.

#### Migration

| Was (`0.2.x`) | Now (`1.0.0`) |
|---|---|
| `u.tasks.list(...)` / `u.tasks.create(...)` | `u.work.query({ viewId })` / `u.work.apply({ operations: [{ op: "record.upsert", tableId, values }] })` |
| `u.crm.searchRecords(...)` / `u.crm.createNote(...)` | `u.work.search({ query })` / `u.work.apply({ operations: [...] })` |
| `u.workspace.tree(id)` / `u.workspace.createArtifact(...)` | `u.work.tree({ teamSpaceId })` / `u.work.apply({ operations: [{ op: "artifact.mount", ... }] })` |
| `unison tasks list` / `unison crm …` / `unison workspace …` | `unison work query …` / `unison work search …` / `unison work apply` |
| `write /wiki/x.md` | `write /private/notes/x.md` (bare names auto-route) |

### Previously unreleased (folded into 1.0.0)

- A pixel-art brain mascot (`assets/brain.svg`) in the README header.

### Fixed

- `unison --version` now reports the real package version (read from
  `package.json` at runtime) instead of a hardcoded string that drifted out of
  sync with the published release.
- The MCP server (`@unisonlabs/mcp`) now reports its version from `package.json`
  at runtime instead of a hardcoded `0.1.0` that had drifted from the published
  package.

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

[Unreleased]: https://github.com/Unison-Workspace/unison-brain/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Unison-Workspace/unison-brain/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/Unison-Workspace/unison-brain/releases/tag/v0.1.0

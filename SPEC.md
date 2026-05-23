# Unison Brain API — Specification

The HTTP contract the **Unison backend** implements and this open-source client
(SDK / CLI / MCP) speaks. It lives in the public client repo so integrators can
build against it directly.

Every operation here is something you can already do with the brain from the
Unison dashboard — the API is dashboard parity, headless.

> **🤖 AI agent?** This spec is the full API contract. To *start using* the brain,
> see [`AGENTS.md`](./AGENTS.md) — the four-step path to a working setup.

---

## 1. Design principles

- **Two abstractions, one brain.** The cortex is a **filesystem** — paths under
  `/wiki/`, `/skills/`, `/actions/` are writable; `/sources/`, `/raw/`, `/system/`
  are read-only synthesis/ingest tiers — **and** a **knowledge graph** (entities →
  bitemporal facts → links). The API exposes both.
- **Three surfaces, deliberately different breadth:**
  - **SDK** — *complete*. Every operation, typed. The reference surface.
  - **CLI** — *complete, ergonomic*. Grouped commands, for humans and shell agents.
  - **MCP** — *curated* (8 tools). Only what an agent should call; a small tool
    count keeps an agent's context lean.
- **The client enforces nothing; the server is the only security boundary.** The
  SDK/CLI/MCP attach the bearer token, send the request, and surface whatever the
  server returns. They never check scopes, validate paths, hide operations, or
  pre-authorize — an open-source client cannot be a security boundary, so it isn't
  one. Authentication, scope and permission enforcement, read-only-tier
  enforcement, tenant isolation, rate limiting, and content safety are all enforced
  **server-side** and are out of scope for this client contract.

## 2. Scope

**In scope:** the full brain — documents, entities, facts, links, dedup review,
job visibility, health.

**Out of scope (deliberately):**
- **Agent chat / sessions / streaming** — a separate, larger product surface, not the brain.
- **Connectors** (Gmail / Drive / Notion / Slack ingest) — browser OAuth + workspace config; not CLI-shaped.
- **Internal worker machinery** — embedding, signal promotion, reconcile/merge pipelines, compaction, ingest jobs. Encapsulated behind the job queue; they auto-run.
- **Visualization** — the 3D graph and inline-diff editor. The *data* behind them (`links`, `neighbors`, `entities`) is exposed; the canvas is not.
- **Local FS mirror** — the CLI verbs plus server-side search already give the filesystem feel with no daemon, staleness, or local copy.

---

## 3. Authentication

`Authorization: Bearer <token>` on every request except the login endpoints. The
token is an API key (`usk_...`) or an access token minted by a browser login.

### How `unison auth login` works

Account creation always happens **in the browser, never in the CLI** — no signup,
password, SSO, or billing in a terminal. A brand-new user runs `unison auth login`,
signs up in the tab that opens, approves, and is logged in — no separate dashboard
visit required.

**Primary — browser loopback (PKCE, RFC 8252 + RFC 7636).** One command:

```
$ unison auth login
→ CLI starts a throwaway listener on 127.0.0.1:<random>
→ opens the browser to  https://app.unisonlabs.ai/cli-auth?…&redirect_uri=http://127.0.0.1:<port>/callback
→ user logs in / signs up / approves
→ the site redirects to the loopback with ?code=…&state=…
→ CLI exchanges code + verifier for a token, stores it, shuts the listener down
```

`state` + the PKCE `code_verifier` prevent CSRF and code interception.

**Fallback — device flow (RFC 8628)** for SSH / headless / no-browser boxes:
`unison auth login --device` prints a short code the user enters on another device.

**CI / automation — API key.** `export UNISON_TOKEN=usk_...`; no browser. Keys are
minted in the dashboard.

### Scopes

- `brain:read` — all GETs
- `brain:write` — document write/delete/tag/share, entity upsert, fact record/correct/invalidate, link
- `brain:admin` — dedup review (merge/unmerge), job retry

A token lacking the required scope gets `403 forbidden`. The client never
pre-checks scopes — it sends the call and surfaces the result.

### Write constraints

Document paths must end in `.md`, and writes/deletes to the read-only tiers
`/sources/`, `/raw/`, `/system/` return `403`; only `/wiki/`, `/skills/`,
`/actions/` are writable. The client offers write/delete/tag for any path and lets
the server reject — it never hides or blocks paths itself.

### Auth endpoints

**Browser loopback (primary):**
- `GET https://app.unisonlabs.ai/cli-auth` — dashboard sign-in page (not under `/v1`). Params: `response_type=code`, `client_id=unison-cli`, `redirect_uri` (must match `http://127.0.0.1:*/callback` — the server allowlists loopback only), `code_challenge`, `code_challenge_method=S256`, `state`, `scope`. Redirects to `redirect_uri?code=…&state=…`.
- `POST /v1/auth/token` — body `{ grantType: "authorization_code", code, codeVerifier, redirectUri, clientId }` → `200 { accessToken, tokenType, scope }`. Verifies PKCE; single-use code; short TTL.

**Device flow (fallback):**
- `POST /v1/auth/device/code` — body `{ clientId: "unison-cli" }` → `{ deviceCode, userCode, verificationUri, verificationUriComplete, interval, expiresIn }`.
- `POST /v1/auth/device/token` — body `{ deviceCode }`. Pending → `400 { error: "authorization_pending" }` (also `slow_down`, `access_denied`, `expired_token`). Approved → `200 { accessToken, tokenType, scope }`.

**Both:**
- `GET /v1/auth/whoami` → `{ user: { id, email }, tenant: { id, name }, scopes[] }`.

---

## 4. Conventions

- **Base URL:** `https://api.unisonlabs.ai` (override with `UNISON_API_URL`).
- **Versioning:** all paths are prefixed `/v1`.
- **JSON, `camelCase`.** Document paths are passed as query params (they contain slashes).
- **Errors:** `{ "error": { "code": "snake_case", "message": "…" } }`. Codes:
  `unauthenticated` (401), `forbidden` (403, missing scope), `not_found` (404),
  `invalid_path` (400, malformed/non-`.md` path), `conflict` (409, content-hash
  mismatch), `rate_limited` (429), plus a generic `5xx` for server errors.
- **Optimistic concurrency:** `write` accepts `expectedContentHash` (hex16); a stale hash returns `409 conflict`.
- **Rate limiting:** per token; retry `429` responses with backoff.
- **Bitemporal time-travel:** `asOf` (datetime) on `search` / `doc` / `factsAbout` returns "what the brain knew as of then."

---

## 5. Resources

### 5.1 Documents (filesystem tier)

| Endpoint | Notes |
|---|---|
| `GET /v1/brain/search?q&k&kind*&tag*&memoryType&asOf` | `k` 1–50 (def 10); `kind` ∈ wiki_page\|raw\|note\|log\|index; `memoryType` ∈ episodic\|semantic\|procedural\|auto. Returns `{ results: RankedHit[] }`, each `{ doc, score, highlight?, sources[] }` — `doc` is a summary (no body) |
| `GET /v1/brain/grep?pattern&caseSensitive&limit` | regex over document bodies; `limit` 1–200 (def 50) |
| `GET /v1/brain/doc?path&asOf` | single document; `404 not_found` when missing |
| `GET /v1/brain/list?prefix&kind*&tag*&limit` | enumerate by prefix / kind / tag |
| `GET /v1/brain/fs?path` | directory listing (dir / file / mtime) |
| `GET /v1/brain/fs/read?path` | raw content of any tier, including read-only ones |
| `PUT /v1/brain/doc` | body: `path` (under `/wiki/` `/skills/` `/actions/`, ends in `.md`), `kind` (def note), `title?`, `tldr?`, `bodyMd` (≤200k), `tags[]`, `visibility` tenant\|private, `expectedContentHash?`, `source?{kind,ref}` |
| `DELETE /v1/brain/doc?path` | delete a document |
| `POST /v1/brain/doc/tag` | body `{ path, add[], remove[] }` |
| `POST /v1/brain/share` | body `{ kind: doc\|fact\|entity, id }` → promote private → tenant |
| `GET /v1/brain/neighbors?idOrPath&kind*&limit` | `kind` ∈ mentions\|derived_from\|supersedes\|see_also; `limit` 1–100 (def 20) |

### 5.2 Entities (graph)

| Endpoint | Notes |
|---|---|
| `GET /v1/brain/entities?kind*&status&limit` | `status` ∈ active\|stub\|archived |
| `GET /v1/brain/entities/resolve?name&kindHint` | exact, then fuzzy + alias match → `{ entity: BrainEntity \| null }` |
| `GET /v1/brain/entities/:id` | get one entity by id |
| `POST /v1/brain/entities` | upsert; body `{ kind, displayName, slug?, aliases[], props{}, status }` |

### 5.3 Facts (bitemporal)

| Endpoint | Notes |
|---|---|
| `GET /v1/brain/facts?limit&includeInvalidated` | browse all facts |
| `GET /v1/brain/entities/:id/facts?asOf&includeInvalidated` | facts about one entity |
| `GET /v1/brain/entities/:id/timeline?from&to` | chronological |
| `POST /v1/brain/facts` | `{ subjectId, predicate, factText, objectJson?, objectEntityId?, validFrom?, validTo?, confidence (0–1, def .6), supersedesId? }` |
| `PATCH /v1/brain/facts/:id` | supersede with corrected fields |
| `DELETE /v1/brain/facts/:id` | soft invalidate (sets `validTo = now`) |

### 5.4 Links (graph edges)

| Endpoint | Notes |
|---|---|
| `GET /v1/brain/links?limit` | all directed edges `{ fromId, toId, kind }` |
| `POST /v1/brain/links` | body `{ fromId, toId, kind }` |

### 5.5 Dedup review (`brain:admin`)

| Endpoint | Notes |
|---|---|
| `GET /v1/brain/review/conflicts` | pending merge pairs + reasoning + exemplars |
| `POST /v1/brain/review/conflicts/:id` | body `{ verdict: merge\|distinct }` |
| `GET /v1/brain/review/merges?limit` | recent merges (undo feed) |
| `POST /v1/brain/review/merges/:id/undo` | enqueue an unmerge |

### 5.6 Jobs (`brain:admin`)

| Endpoint | Notes |
|---|---|
| `GET /v1/brain/jobs?status&kind&limit` | queue visibility |
| `GET /v1/brain/jobs/stats` | counts by status |
| `POST /v1/brain/jobs/:id/retry` | re-queue a failed job |

### 5.7 Status

| Endpoint | Returns |
|---|---|
| `GET /v1/brain/status` | `{ docCount, docWithEmbedding, entityCount, factCount, lastIngestAt, pendingJobs, staleWikiPageCount }` |

---

## 6. Surface mapping — REST → CLI → SDK → MCP

MCP column: ✓ = exposed as an agent tool; — = SDK/CLI only.

| Operation | CLI | SDK method | MCP |
|---|---|---|---|
| search | `unison search <q> [-k --kind --tag --memory-type --as-of]` | `brain.search()` | ✓ `brain_search` |
| grep | `unison grep <pattern> [--case-sensitive]` | `brain.grep()` | — |
| read doc | `unison get <path> [--json --as-of]` (alias `cat`) | `brain.get()` | ✓ `brain_get` |
| list docs | `unison ls [path] [--docs --kind --tag]` | `brain.list()` | ✓ `brain_list` |
| fs tree / raw | `unison tree [path]` / `unison get --raw <path>` | `brain.listFs()` / `brain.readFs()` | — |
| find by glob | `unison find <glob>` | `brain.list()` | — |
| write doc | `unison write <path> [-m --title --tldr --tag --visibility --if-match]` | `brain.write()` | ✓ `brain_write` |
| delete doc | `unison rm <path>` | `brain.delete()` | — |
| tag doc | `unison tag <path> [--add --remove]` | `brain.tag()` | — |
| share | `unison share <doc\|fact\|entity> <id>` | `brain.share()` | — |
| neighbors | `unison neighbors <idOrPath>` | `brain.neighbors()` | — |
| list entities | `unison entity ls [--kind --status]` | `brain.entities.list()` | — |
| resolve entity | `unison entity resolve <name>` | `brain.entities.resolve()` | ✓ `brain_resolve_entity` |
| get entity | `unison entity get <id>` | `brain.entities.get()` | — |
| upsert entity | `unison entity set <kind> <name> [--alias --prop]` | `brain.entities.upsert()` | — |
| list facts | `unison fact ls [--all]` | `brain.facts.list()` | — |
| facts about | `unison fact ls --entity <id>` | `brain.facts.about()` | ✓ `brain_facts_about` |
| timeline | `unison timeline <entityId> [--from --to]` | `brain.facts.timeline()` | — |
| record fact | `unison fact add <entityId> <predicate> <text> [--confidence]` | `brain.facts.record()` | ✓ `brain_record_fact` |
| correct fact | `unison fact correct <factId> […]` | `brain.facts.correct()` | — |
| invalidate fact | `unison fact rm <factId>` | `brain.facts.invalidate()` | — |
| list links | `unison links` | `brain.links.list()` | — |
| create link | `unison link <fromId> <toId> --kind <k>` | `brain.links.create()` | — |
| review conflicts | `unison review ls` | `brain.review.conflicts()` | — |
| resolve match | `unison review merge\|distinct <id>` | `brain.review.resolve()` | — |
| recent merges | `unison review merges` | `brain.review.merges()` | — |
| unmerge | `unison review undo <mergeId>` | `brain.review.undo()` | — |
| jobs | `unison jobs ls [--status] \| jobs stats \| jobs retry <id>` | `brain.jobs.*()` | — |
| status | `unison status` | `brain.status()` | ✓ `brain_status` |
| auth | `unison auth login\|logout\|status` | `startDeviceAuth()` / `pollDeviceToken()` | — |

MCP tool set (8): `brain_search`, `brain_get`, `brain_list`, `brain_write`,
`brain_resolve_entity`, `brain_facts_about`, `brain_record_fact`, `brain_status`.

---

## 7. Availability

The hosted brain is live at `https://api.unisonlabs.ai` — the default base URL for
the SDK, CLI, and MCP server. To target a different backend, override with
`UNISON_API_URL` (and `UNISON_APP_URL` for the sign-in page), or
`unison auth login --api-url <url>`.

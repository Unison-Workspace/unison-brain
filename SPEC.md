# Unison Brain API — Specification

The contract the **Unison backend** implements and this open-source client
(SDK / CLI / MCP) targets. It lives in the public client repo so integrators can
read it. **No backend code lives here** — implementation happens in the closed
Unison monorepo (`apps/api`), as a thin REST facade over the existing
`agents.cortex.*` tRPC router plus a machine-auth path.

Every operation below is something a user can already do with the brain from the
Unison dashboard (`/agents/brain`). The goal: parity with the dashboard, headless.

---

## 1. Design principles

- **Two abstractions, one brain.** The cortex is a **filesystem** (paths under
  `/wiki/`, `/skills/`, `/actions/` are writable; `/sources/`, `/raw/`, `/system/`
  are read-only synth/ingest tiers) **and** a **knowledge graph**
  (entities → bitemporal facts → links). The API exposes both.
- **Three surfaces, deliberately different breadth:**
  - **SDK** — *complete*. Every user-facing operation, typed. The contract.
  - **CLI** — *complete, ergonomic*. Grouped commands; for humans and shell agents.
  - **MCP** — *curated* (~8 tools). Only what an agent should call. Agents must not
    merge entities, retry jobs, or delete docs. Small tool count avoids context bloat.
- **The client enforces nothing; the server is the only security boundary.** The
  SDK/CLI/MCP attach the bearer token, send the request, and surface whatever the
  server returns (e.g. `403`). They never check scopes, validate paths, hide
  operations, or pre-authorize — an open-source client cannot be a security
  boundary, so it isn't one. All authentication, scope/permission enforcement,
  read-only-tier enforcement, tenant isolation, rate limiting, and content
  safety live **server-side**. (MCP's smaller tool set is an agent-ergonomics
  choice to avoid context bloat — not an enforcement mechanism.)
- **Server enforcement is a separate spec.** The concrete server controls (RLS,
  key hashing, BOLA, token-volume rate limits, prompt-injection scanning,
  device-flow hardening) are deferred to a server spec written when the backend
  is built. This document is the *client/contract* spec: what operations exist
  and what errors the server may return.

## 2. Scope

**In scope (this spec):** the full brain — documents, entities, facts, links,
dedup review, job visibility, health. Tiers 1–3 below.

**Out of scope (deliberately):**
- **Agent chat / sessions / streaming** (`agents.runs.*`, `agents.documents.*`) —
  a separate, larger product surface, not the brain.
- **Connectors** (Gmail / Drive / Notion / Slack ingest) — browser OAuth + workspace
  config; not CLI-shaped.
- **Internal worker machinery** — embedding, signal promotion, reconcile/merge
  pipelines, compaction, ingest jobs. Encapsulated behind the job queue; auto-run.
- **Visualization** — the 3D graph and inline-diff editor. The *data* behind them
  (`links`, `neighbors`, `listEntities`) is exposed; the canvas is not.
- **Local FS mirror (`unison sync`)** — deferred. The CLI verbs + server-side
  search already give an agent the filesystem feel with no daemon, staleness, or
  local copy. Revisit only if users ask to edit brain docs in their own editor or
  work offline.

---

## 3. Authentication

`Authorization: Bearer <token>` on every request except the login endpoints.
Token is an API key (`usk_...`) or an access token minted by a browser login.

### How `unison auth login` works

**Account creation always happens in the browser, never in the CLI** — no signup,
password, SSO, or billing in a terminal. The CLI authenticates an *existing or
newly-created* account; the browser tab handles the account part. A brand-new user
runs `unison auth login` first, signs up in the tab that opens, approves, and is
logged in — they never visit the dashboard as a separate prerequisite step.

**Primary — browser loopback (PKCE, RFC 8252 + RFC 7636).** One command, nothing
else local:
```
$ unison auth login
→ CLI starts a throwaway listener on 127.0.0.1:<random> (invisible to the user)
→ opens browser to  https://app.unison.computer/cli-auth?...&redirect_uri=http://127.0.0.1:<port>/callback
→ user logs in / signs up / approves on our site
→ our site redirects to the loopback with ?code=...&state=...
→ CLI exchanges code+verifier for a token, stores it, shuts the listener down
```
The user starts no server and sees no code — just: browser opens our site → approve
→ "authenticated". State + PKCE `code_verifier` prevent CSRF / code interception.

**Fallback — device flow (RFC 8628)** for SSH / headless / no-browser boxes: the
CLI prints a short code; the user enters it on our site from another device.
`unison auth login --device`.

**CI / automation — API key.** `export UNISON_TOKEN=usk_...`; no browser. Keys are
minted in the dashboard.

### Backend gap — the one true blocker
Today all requests need a Supabase **user** JWT; a headless client can't get one.
Backend must add a machine-credential path:
1. `api_keys` table: `(id, tenant_id, user_id, name, hashed_key, scopes[], last_used_at, created_at, revoked_at)`. Store only a hash; show plaintext once.
2. Context builder branches: `Bearer usk_...` → resolve `(tenant, user, scopes)` and mint a synthetic authed context; `Bearer <jwt>` → existing path unchanged.

### Scopes (server-enforced; client just passes the token)
- `brain:read` → all GETs
- `brain:write` → document write/delete/tag/share, entity upsert, fact record/correct/invalidate, link
- `brain:admin` → dedup review (merge/unmerge), job retry

A token lacking the required scope gets `403 forbidden`. The client does not
pre-check scopes — it sends the call and surfaces the result.

### Write constraints (server-enforced)
Writes/deletes to the read-only tiers `/sources/`, `/raw/`, `/system/` return
`403`. Only `/wiki/`, `/skills/`, `/actions/` are writable. The client offers the
write/delete/tag commands for any path and lets the server reject — it never
hides or blocks paths itself.

### Endpoints
**Browser loopback (primary):**
- `GET https://app.unison.computer/cli-auth` — dashboard page (not `/v1`). Params: `response_type=code`, `client_id=unison-cli`, `redirect_uri` (must match `http://127.0.0.1:*/callback` — server allowlists loopback only), `code_challenge`, `code_challenge_method=S256`, `state`, `scope`. User logs in/signs up/approves; redirects to `redirect_uri?code=...&state=...`.
- `POST /v1/auth/token` — body `{ grantType: "authorization_code", code, codeVerifier, redirectUri, clientId }` → `200 { accessToken, tokenType, scope }`. Verifies PKCE; single-use code; short TTL.

**Device flow (fallback):**
- `POST /v1/auth/device/code` — body `{ clientId: "unison-cli" }` → `{ deviceCode, userCode, verificationUri, verificationUriComplete, interval, expiresIn }` (RFC 8628).
- `POST /v1/auth/device/token` — body `{ deviceCode }`. Pending→`400 {error:"authorization_pending"}`; also `slow_down`, `access_denied`, `expired_token`. Approved→`200 { accessToken, tokenType, scope }`.

**Both:**
- `GET /v1/auth/whoami` → `{ user:{id,email}, tenant:{id,name}, scopes[] }`.

The verification page (`/device` in the dashboard) is where the logged-in user
confirms the `userCode`, picks a tenant, and approves — minting the token.

---

## 4. Conventions

- **Base URL:** configurable; production TBD (client default `https://api.unison.computer`).
- **Versioning:** all paths prefixed `/v1`.
- **JSON, `camelCase`.** Paths are passed as query params (they contain slashes).
- **Errors:** `{ "error": { "code": "snake_case", "message": "..." } }` with codes
  `unauthenticated` (401), `forbidden` (403, missing scope), `not_found` (404),
  `conflict` (409, content-hash mismatch), `rate_limited` (429), `http_error` (5xx).
- **Optimistic concurrency:** `write` accepts `expectedContentHash` (hex16); a stale
  hash returns `409 conflict`.
- **Rate limiting:** per key; `X-RateLimit-*` headers; `429` carries `Retry-After`.
- **Bitemporal time-travel:** `asOf` (datetime) on `search`/`read`/`factsAbout` →
  "what the brain knew as of then." A genuine differentiator; surface it.

---

## 5. Resources

Field names mirror the existing `agents.cortex.*` zod schemas exactly.

### 5.1 Documents (filesystem tier)

| REST | Maps to | Notes |
|---|---|---|
| `GET /v1/brain/search?q&k&kind*&tag*&memoryType&asOf` | `cortex.search` | `k` 1–50 (def 10); `kind` ∈ wiki_page\|raw\|note\|log\|index; `memoryType` ∈ episodic\|semantic\|procedural\|auto. Returns `RankedHit[]` = `{ doc, score, highlight?, sources[] }` (doc is **nested**, not flattened) |
| `GET /v1/brain/grep?pattern&caseSensitive&limit` | `cortex.grep` | regex over bodies; `limit` 1–200 (def 50) |
| `GET /v1/brain/doc?path&asOf` | `cortex.read` | single doc; routes synth-reads (`/system/`,`/raw/`) |
| `GET /v1/brain/list?prefix&kind*&tag*&limit` | `cortex.list` | enumerate by prefix/kind/tag |
| `GET /v1/brain/fs?path` | `cortex.listFs` | directory listing (dir/file/mtime), bootstraps SCHEMA.md |
| `GET /v1/brain/fs/read?path` | `cortex.readFs` | raw content of any tier incl. read-only ones |
| `PUT /v1/brain/doc` | `cortex.write` | body: `path` (must be under /wiki//skills//actions/), `kind` (def note), `title?`, `tldr?`, `bodyMd` (≤200k), `tags[]`, `visibility` tenant\|private, `expectedContentHash?`, `source?{kind,ref}` |
| `DELETE /v1/brain/doc?path` | **BrainFs.delete** ⚠ needs route | |
| `POST /v1/brain/doc/tag` | **BrainFs.tag** ⚠ needs route | body `{ path, add[], remove[] }` |
| `POST /v1/brain/share` | `cortex.share` | body `{ kind: doc\|fact\|entity, id }` → promote private→tenant |
| `GET /v1/brain/neighbors?idOrPath&kind*&limit` | `cortex.neighbors` | `kind` ∈ mentions\|derived_from\|supersedes\|see_also; `limit` 1–100 (def 20) |

### 5.2 Entities (graph)

| REST | Maps to | Notes |
|---|---|---|
| `GET /v1/brain/entities?kind*&status&limit` | `cortex.listEntities` | `status` ∈ active\|stub\|archived |
| `GET /v1/brain/entities/resolve?name&kindHint` | `cortex.resolveEntity` | fuzzy + alias match → `BrainEntity\|null` |
| `GET /v1/brain/entities/:id` | **BrainFs.getEntity** ⚠ needs route | get by id |
| `POST /v1/brain/entities` | `cortex.upsertEntity` | body `{ kind, displayName, slug?, aliases[], props{}, status }` |
| `POST /v1/brain/entities/:id/aliases` | **BrainFs.addAlias** ⚠ needs route | optional; or fold into upsert |

### 5.3 Facts (bitemporal)

| REST | Maps to | Notes |
|---|---|---|
| `GET /v1/brain/facts?limit&includeInvalidated` | `cortex.listFacts` | browse all |
| `GET /v1/brain/entities/:id/facts?asOf&includeInvalidated` | `cortex.factsAbout` | facts about one entity |
| `GET /v1/brain/entities/:id/timeline?from&to` | `cortex.timeline` | chronological |
| `POST /v1/brain/facts` | `cortex.recordFact` | `{ subjectId, predicate, factText, objectJson?, objectEntityId?, validFrom?, validTo?, confidence(0–1 def .6), supersedesId? }` |
| `PATCH /v1/brain/facts/:id` | `cortex.correctFact` | supersede with corrected fields |
| `DELETE /v1/brain/facts/:id` | `cortex.invalidateFact` | soft (sets valid_to=now) |

### 5.4 Links (graph edges)

| REST | Maps to | Notes |
|---|---|---|
| `GET /v1/brain/links?limit` | `cortex.links` | all directed edges `{fromId,toId,kind}` |
| `POST /v1/brain/links` | `cortex.link` | body `{ fromId, toId, kind }` |

### 5.5 Dedup review (`brain:admin`)

| REST | Maps to | Notes |
|---|---|---|
| `GET /v1/brain/review/conflicts` | `cortex.listMatchConflicts` | pending merge pairs + reasoning + exemplars |
| `POST /v1/brain/review/conflicts/:id` | `cortex.resolveMatch` | body `{ verdict: merge\|distinct }` |
| `GET /v1/brain/review/merges?limit` | `cortex.listRecentMerges` | undo panel feed |
| `POST /v1/brain/review/merges/:id/undo` | `cortex.unmergeEntity` | enqueues unmerge |

### 5.6 Jobs (operator, `brain:admin`)

| REST | Maps to | Notes |
|---|---|---|
| `GET /v1/brain/jobs?status&kind&limit` | `agents.jobs.list` | queue visibility |
| `GET /v1/brain/jobs/stats` | `agents.jobs.stats` | counts by status |
| `POST /v1/brain/jobs/:id/retry` | `agents.jobs.retry` | re-queue a failed job |

### 5.7 Status

| REST | Maps to |
|---|---|
| `GET /v1/brain/status` | `cortex.health` → `{ docCount, docWithEmbedding, entityCount, factCount, lastIngestAt, pendingJobs, staleWikiPageCount }` |

---

## 6. Surface mapping — REST → CLI → SDK → MCP

MCP column: ✓ = exposed as an agent tool; — = SDK/CLI only.

| Operation | CLI | SDK method | MCP |
|---|---|---|---|
| search | `unison search <q> [-k --kind --tag --memory-type --as-of]` | `brain.search()` | ✓ `brain_search` |
| grep | `unison grep <pattern> [--case-sensitive]` | `brain.grep()` | — |
| read doc | `unison get <path> [--json --as-of]` | `brain.get()` | ✓ `brain_get` |
| list docs | `unison ls [prefix] [--kind --tag]` | `brain.list()` | ✓ `brain_list` |
| fs tree / raw | `unison ls --tree <path>` / `unison get --raw <path>` | `brain.listFs()` / `brain.readFs()` | — |
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
| correct fact | `unison fact correct <factId> [...]` | `brain.facts.correct()` | — |
| invalidate fact | `unison fact rm <factId>` | `brain.facts.invalidate()` | — |
| list links | `unison links` | `brain.links.list()` | — |
| create link | `unison link <fromId> <toId> --kind <k>` | `brain.links.create()` | — |
| review conflicts | `unison review ls` | `brain.review.conflicts()` | — |
| resolve match | `unison review merge\|distinct <id>` | `brain.review.resolve()` | — |
| recent merges | `unison review merges` | `brain.review.merges()` | — |
| unmerge | `unison review undo <mergeId>` | `brain.review.undo()` | — |
| jobs | `unison jobs ls [--status]` / `jobs stats` / `jobs retry <id>` | `brain.jobs.*()` | — |
| status | `unison status` | `brain.status()` | ✓ `brain_status` |
| auth | `unison auth login\|logout\|status` | `startDeviceAuth()` / `pollDeviceToken()` | — |

MCP tool set (8): `brain_search`, `brain_get`, `brain_write`, `brain_list`,
`brain_resolve_entity`, `brain_facts_about`, `brain_record_fact`, `brain_status`.

---

## 7. Backend work required

1. **Machine auth** — `api_keys` table + key→context branch + scopes (§3). *The blocker.*
2. **REST facade** — ~30 routes over the existing `cortex.*` procedures (mostly mechanical).
3. **Three new tRPC/REST routes** for BrainFs methods that exist but aren't exposed:
   `delete(path)`, `tag(path, add, remove)`, `getEntity(id)` (and optionally `addAlias`).
4. **Device-flow endpoints** + the `/device` approval page in the dashboard.

The client in this repo is built to this spec; the current scaffold implements
only the Tier-1 document subset and will be expanded to match.

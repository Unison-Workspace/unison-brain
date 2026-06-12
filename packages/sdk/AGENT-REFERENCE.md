# Unison SDK — agent method reference (v1.5.1)

Generated from the `@unisonlabs/sdk` type declarations. Call the brain
through the SDK, never by hand-rolling `fetch()` to `/v1/…` paths:

```ts
import { BrainClient } from "@unisonlabs/sdk";
const u = new BrainClient({ baseUrl: Deno.env.get("UNISON_API_URL"), token: Deno.env.get("UNISON_TOKEN") });
```

## brain

Documents + filesystem on the brain — called directly on the client.

### `u.search`

```ts
search(query: string, opts?: SearchOptions): Promise<SearchResult[]>
```

`opts?` (`SearchOptions`):
- `limit?: number`
- `kinds?: DocKind[]`
- `tags?: string[]`
- `memoryType?: MemoryType`
- `asOf?: string`
- `pathPrefix?: string` — Restrict results to documents under this path prefix (e.g. "/private/notes").

### `u.grep`

```ts
grep(pattern: string, opts?: GrepOptions): Promise<BrainDocument[]>
```

`opts?` (`GrepOptions`):
- `caseSensitive?: boolean`
- `limit?: number`

### `u.get`

```ts
get(path: string): Promise<BrainDocument>
```

### `u.list`

```ts
list(opts?: ListOptions): Promise<BrainDocument[]>
```

`opts?` (`ListOptions`):
- `prefix?: string`
- `kinds?: DocKind[]`
- `tags?: string[]`
- `limit?: number`

### `u.listFs`

```ts
listFs(path?: string): Promise<FsEntry[]>
```

### `u.getRaw`

```ts
getRaw(path: string): Promise<{ content: string | null; path: string; }>
```

### `u.write`

```ts
write(input: WriteInput): Promise<BrainDocument>
```

`input` (`WriteInput`):
- `path: string`
- `bodyMd: string`
- `kind?: DocKind`
- `title?: string`
- `tldr?: string`
- `tags?: string[]`
- `visibility?: Visibility`
- `expectedContentHash?: string`
- `source?: { kind: string; ref: string; }`

### `u.editDoc`

```ts
editDoc(input: { path: string; oldStr: string; newStr: string; expectedContentHash?: string; }): Promise<BrainDocument>
```

Surgical in-place edit, mirroring Claude Code's `Edit`: replace an exact
`oldStr` with `newStr`. `oldStr` must match the document body exactly once,
or the edit refuses (add surrounding context to disambiguate).

Routes to `PATCH /brain/doc`, which performs the match + replace
server-side inside the write transaction — atomic and uniqueness-checked,
so there is no racy client read-modify-write and metadata is preserved.
Pass `expectedContentHash` for optimistic-concurrency on hot docs.

### `u.context`

```ts
context(opts: ContextOptions): Promise<ContextResult>
```

One-call recall — fetch the most relevant memory for a natural-language
query and get back a prompt-ready `contextMd` block.

The brain does NO answer generation. Pass `contextMd` verbatim into your
system prompt or user turn; the caller's LLM composes the answer.

Scope: `brain:read`.

`opts` (`ContextOptions`):
- `query: string` — Natural-language question to recall context for.
- `mode?: ContextMode` — Retrieval depth: auto (default) = the server decides; deep = multi-hop graph expansion; standard = single-pass vector.
- `k?: number` — Max semantic hits to return (1–50, default 10).
- `maxEntities?: number` — Max entity summaries to include (0–10, default 3).
- `pathPrefix?: string` — Scope retrieval to a path subtree, e.g. "/private/notes/".
- `includeBodies?: boolean` — Inline full (clipped) document bodies into contextMd — for single-shot readers that won't follow up with reads.

### `u.ingest`

```ts
ingest(input: IngestInput): Promise<IngestResult>
```

Stream conversations or documents into the brain's memory pipeline.

Conversations are routed through the signal-extraction pipeline and produce
entities + facts. Documents are written as extractable notes.

Scope: `brain:write`.

`input` (`IngestInput`):
- `items: IngestItem[]` — 1–100 items per call.

### `u.writeDocs`

```ts
writeDocs(docs: WriteDocInput[]): Promise<BrainDocument[]>
```

Batch write multiple documents in a single call.
Equivalent to calling `write()` on each document but with one round-trip.

Scope: `brain:write`.

`docs` (`WriteDocInput[]`):
- `path: string`
- `bodyMd: string`
- `kind?: DocKind`
- `title?: string`
- `tldr?: string`
- `tags?: string[]`
- `visibility?: Visibility`
- `expectedContentHash?: string`

### `u.patchDocMeta`

```ts
patchDocMeta(input: EditDocMetaInput): Promise<BrainDocument>
```

Patch metadata (title, tldr, tags) on an existing document without
touching its body. Accepts both the full edit-doc form (oldStr/newStr)
and a metadata-only form — pass `title`, `tldr`, or `tags` to update
metadata only.

The oldStr/newStr form is unchanged: use `editDoc()` for body edits.
Use this overload when you only need to rename, re-summarize, or re-tag.

Scope: `brain:write`.

`input` (`EditDocMetaInput`):
- `path: string`
- `title?: string`
- `tldr?: string`
- `tags?: string[]`

### `u.delete`

```ts
delete(path: string): Promise<{ deleted: boolean; }>
```

### `u.tag`

```ts
tag(path: string, input: TagInput): Promise<BrainDocument>
```

`input` (`TagInput`):
- `add?: string[]`
- `remove?: string[]`

### `u.share`

```ts
share(kind: ShareKind, id: string): Promise<{ shared: boolean; }>
```

### `u.neighbors`

```ts
neighbors(idOrPath: string, opts?: NeighborsOptions): Promise<BrainDocument[]>
```

`opts?` (`NeighborsOptions`):
- `kinds?: LinkKind[]`
- `limit?: number`

### `u.status`

```ts
status(): Promise<BrainStatus>
```

### `u.whoami`

```ts
whoami(): Promise<WhoAmI>
```

### `u.withActor`

```ts
withActor(externalId: string | null | undefined): BrainClient
```

Return a derived client that sends `X-Unison-Actor: <externalId>` on every
request. The key must carry the `brain:act-as` scope. Shadow users are
auto-created server-side; `/private` scoping isolates actors automatically.

Pass `null` or `undefined` to clear the actor (return a client without
the header).

Throws synchronously if `externalId` is non-null and fails the format check.

## entities

Knowledge-graph entities (people, companies, projects, …).

### `u.entities.list`

```ts
list(opts?: ListEntitiesOptions): Promise<BrainEntity[]>
```

`opts?` (`ListEntitiesOptions`):
- `kinds?: string[]`
- `status?: EntityStatus`
- `limit?: number`

### `u.entities.resolve`

```ts
resolve(name: string, kindHint?: EntityKind): Promise<BrainEntity | null>
```

### `u.entities.get`

```ts
get(id: string): Promise<BrainEntity>
```

### `u.entities.upsert`

```ts
upsert(input: UpsertEntityInput): Promise<BrainEntity>
```

`input` (`UpsertEntityInput`):
- `kind: EntityKind`
- `displayName: string`
- `slug?: string`
- `aliases?: string[]`
- `props?: Record<string, unknown>`
- `status?: EntityStatus`

## facts

Bitemporal facts about entities.

### `u.facts.list`

```ts
list(opts?: { limit?: number; includeInvalidated?: boolean; }): Promise<BrainFact[]>
```

### `u.facts.about`

```ts
about(entityId: string, opts?: FactsAboutOptions): Promise<BrainFact[]>
```

`opts?` (`FactsAboutOptions`):
- `asOf?: string`
- `includeInvalidated?: boolean`

### `u.facts.timeline`

```ts
timeline(entityId: string, opts?: TimelineOptions): Promise<BrainFact[]>
```

`opts?` (`TimelineOptions`):
- `from?: string`
- `to?: string`

### `u.facts.record`

```ts
record(input: RecordFactInput): Promise<BrainFact>
```

`input` (`RecordFactInput`):
- `subjectId: string`
- `predicate: string`
- `factText: string`
- `objectJson?: unknown`
- `objectEntityId?: string`
- `validFrom?: string`
- `validTo?: string`
- `confidence?: number`
- `supersedesId?: string`

### `u.facts.correct`

```ts
correct(factId: string, input: CorrectFactInput): Promise<BrainFact>
```

`input` (`CorrectFactInput`):
- `predicate?: string`
- `factText?: string`
- `objectJson?: unknown`
- `objectEntityId?: string`
- `confidence?: number`

### `u.facts.invalidate`

```ts
invalidate(factId: string): Promise<{ invalidated: boolean; }>
```

## links

Edges between graph entities.

### `u.links.list`

```ts
list(limit?: number): Promise<BrainLink[]>
```

### `u.links.create`

```ts
create(fromId: string, toId: string, kind: string): Promise<void>
```

## review

Entity-resolution conflicts + merge review.

### `u.review.conflicts`

```ts
conflicts(): Promise<MatchConflict[]>
```

### `u.review.resolve`

```ts
resolve(conflictId: string, verdict: MatchVerdict): Promise<{ ok: true; }>
```

### `u.review.merges`

```ts
merges(limit?: number): Promise<MergeEvent[]>
```

### `u.review.undo`

```ts
undo(mergeEventId: string): Promise<{ ok: true; }>
```

## jobs

Background brain maintenance jobs.

### `u.jobs.list`

```ts
list(opts?: ListJobsOptions): Promise<BrainJob[]>
```

`opts?` (`ListJobsOptions`):
- `status?: JobStatus`
- `kind?: string`
- `limit?: number`

### `u.jobs.stats`

```ts
stats(): Promise<JobStats>
```

### `u.jobs.retry`

```ts
retry(jobId: string): Promise<{ retried: boolean; }>
```

## work

Work primitives — folders, documents, tables, records, views, assets, and the CRM/Tasks tables.

### `u.work.apply`

```ts
apply(input: WorkApplyInput): Promise<JsonRecord>
```

Atomically apply Work primitive operations. Set `dryRun` to validate
without writing (routes to `/v1/work/apply:dry-run`).

`input` (`WorkApplyInput`):
- `operations: WorkOperation[]`
- `dryRun?: boolean`
- `idempotencyKey?: string`

### `u.work.applyDryRun`

```ts
applyDryRun(input: Omit<WorkApplyInput, "dryRun">): Promise<JsonRecord>
```

Validate operations WITHOUT writing — the dedicated, discoverable dry-run
entry point. Same shape + result as `apply`; routes to
`/v1/work/apply:dry-run`. Prefer this over `apply({ dryRun: true })`.

`input` (`Omit<WorkApplyInput, "dryRun">`):
- `operations: WorkOperation[]`
- `dryRun?: boolean`
- `idempotencyKey?: string`

### `u.work.query`

```ts
query(input: WorkQueryInput): Promise<JsonRecord>
```

Query a Work view by id (filters / sorts come from `query`).

`input` (`WorkQueryInput`):
- `viewId: string`
- `query?: WorkViewQuery`

### `u.work.records`

```ts
records(input: WorkRecordsInput): Promise<JsonRecord>
```

List the records of a table directly — no view needed. Pass `tableId` for any
table, or `semanticKind` (company/person/deal/task) to read the canonical
CRM/Tasks table without first discovering its id. Use this to list/count/
summarize the CRM (it is tenant-scoped and never appears in `tree()`).

`input` (`WorkRecordsInput`):
- `tableId?: string` — Read this exact table's records.
- `semanticKind?: string` — Or resolve the canonical CRM/Tasks table: company | person | deal | task.
- `limit?: number`

### `u.work.search`

```ts
search(input: WorkSearchInput): Promise<JsonRecord>
```

Search folders, artifacts, documents, tables, records, and assets.

`input` (`WorkSearchInput`):
- `query: string`
- `limit?: number`

### `u.work.inspect`

```ts
inspect(input: WorkInspectInput): Promise<JsonRecord>
```

Inspect a single primitive by kind + id.

`input` (`WorkInspectInput`):
- `kind: WorkInspectKind`
- `id: string`

### `u.work.tree`

```ts
tree(input?: WorkTreeInput): Promise<JsonRecord>
```

Read the folder + artifact tree (optionally scoped to a team space).

`input?` (`WorkTreeInput`):
- `teamSpaceId?: string`

### `u.work.folder`

```ts
folder(id: string): Promise<JsonRecord>
```

### `u.work.artifact`

```ts
artifact(id: string): Promise<JsonRecord>
```

### `u.work.tableSchema`

```ts
tableSchema(id: string): Promise<JsonRecord>
```

### `u.work.viewQuery`

```ts
viewQuery(id: string, query?: WorkViewQuery): Promise<JsonRecord>
```

### `u.work.assets.uploadUrl`

```ts
uploadUrl(input: WorkAssetUploadUrlInput): Promise<JsonRecord>
```

### `u.work.assets.create`

```ts
create(input: WorkAssetCompleteInput): Promise<JsonRecord>
```

### `u.work.assets.readUrl`

```ts
readUrl(id: string, opts?: WorkAssetReadUrlOptions): Promise<JsonRecord>
```

`opts?` (`WorkAssetReadUrlOptions`):
- `expiresIn?: number` — Signed-URL lifetime in seconds (server default ~600s).

### `u.work.assets.upload`

```ts
upload(input: WorkAssetUploadInput): Promise<JsonRecord>
```

`input` (`WorkAssetUploadInput`):
- `filename: string`
- `mimeType: string`
- `data: ArrayBuffer | Uint8Array | Blob`
- `sizeBytes?: number` — Defaults to the byte length of `data`.
- `displayName?: string`
- `sha256?: string | null`
- `metadata?: JsonRecord`

## mail

Gmail — threads, drafts, send.

### `u.mail.connection`

```ts
connection(): Promise<JsonRecord>
```

### `u.mail.folders`

```ts
folders(): Promise<JsonRecord>
```

### `u.mail.threads`

```ts
threads(opts?: MailThreadsOptions): Promise<JsonRecord>
```

`opts?` (`MailThreadsOptions`):
- `folder?: "inbox" | "sent" | "drafts" | "starred" | "trash"`
- `q?: string`
- `cursor?: string`
- `limit?: number`

### `u.mail.thread`

```ts
thread(id: string, opts?: { allowImages?: boolean; }): Promise<JsonRecord>
```

### `u.mail.send`

```ts
send(input: MailSendInput): Promise<JsonRecord>
```

`input` (`MailSendInput`):
- `to: string[]`
- `cc?: string[]`
- `bcc?: string[]`
- `subject?: string`
- `body?: string`
- `threadId?: string`

### `u.mail.draft`

```ts
draft(input: MailDraftInput): Promise<JsonRecord>
```

Draft an email into the in-app review surface (`app:emails`) for the user to
review, edit, approve/send, or discard — the human-in-the-loop email flow.
Use this for ALL drafting (new emails AND replies via `replyToThreadId`).
Drafting needs no Gmail connection; sending (from the surface) does. This is
the only draft path — there is no "save to Gmail Drafts" tool.

`input` (`MailDraftInput`):
- `to?: MailAddressInput[]` — Recipients for a NEW email. Omit for a reply — when `replyToThreadId` is set the recipients + subject are derived from the thread automatically.
- `cc?: MailAddressInput[]`
- `subject?: string`
- `body?: string`
- `replyToThreadId?: string` — Reply INTO an existing Gmail thread. The server builds the thread headers (In-Reply-To / References) + recipient sets from the thread, so the draft sends as a proper threaded reply when the user approves it.
- `replyMode?: "reply" | "reply_all"` — "reply" = sender only, "reply_all" = everyone on the thread (default for replies).
- `sessionId?: string` — Session the draft attaches to (drives the canvas `app:emails` review surface). In the agent's Deno sandbox it defaults to the injected UNISON_SESSION_ID, so the agent normally doesn't pass it.

## chat

Workspace chat — channels, messages, DMs, members.

### `u.chat.channels`

```ts
channels(): Promise<JsonRecord[]>
```

### `u.chat.channel`

```ts
channel(id: string): Promise<JsonRecord>
```

### `u.chat.messages`

```ts
messages(channelId: string, opts?: ChatMessagesOptions): Promise<JsonRecord>
```

`opts?` (`ChatMessagesOptions`):
- `limit?: number`
- `cursor?: string`

### `u.chat.send`

```ts
send(input: ChatSendInput): Promise<JsonRecord>
```

`input` (`ChatSendInput`):
- `channelId: string`
- `content?: string`
- `mentionUserIds?: string[]`
- `replyToMessageId?: string`
- `threadRootId?: string`

### `u.chat.search`

```ts
search(query: string, opts?: { channelId?: string; limit?: number; }): Promise<JsonRecord>
```

### `u.chat.threadReplies`

```ts
threadReplies(threadRootId: string, opts?: { limit?: number; cursor?: string; }): Promise<JsonRecord>
```

### `u.chat.openDm`

```ts
openDm(otherUserId: string): Promise<JsonRecord>
```

Open or create a 1:1 DM channel with another user; returns `{ channelId }`.

### `u.chat.members`

```ts
members(q?: string): Promise<JsonRecord[]>
```

List/search workspace members (resolve a teammate name to a user id).

## calendar

Calendar — events.

### `u.calendar.connection`

```ts
connection(): Promise<JsonRecord>
```

### `u.calendar.calendars`

```ts
calendars(): Promise<JsonRecord[]>
```

### `u.calendar.events`

```ts
events(opts: { from: string; to: string; calendarIds?: string[]; }): Promise<JsonRecord>
```

### `u.calendar.event`

```ts
event(id: string): Promise<JsonRecord>
```

### `u.calendar.createEvent`

```ts
createEvent(input: CalendarEventCreateInput): Promise<JsonRecord>
```

`input` (`CalendarEventCreateInput`):
- `calendarId: string`
- `summary?: string`
- `description?: string`
- `location?: string`
- `startAt: string`
- `endAt: string`
- `allDay?: boolean`
- `attendees?: { email: string; displayName?: string; }[]`
- `addMeetLink?: boolean`
- `recurrencePreset?: "none" | "daily" | "weekly" | "monthly_nth_weekday" | "annually"`
- `requestId: string` — Idempotency key (uuid) — required by the API.
- `sendUpdates?: "all" | "none"`

## people

CRM people search.

### `u.people.search`

```ts
search(query: string, opts?: PeopleListOpts): Promise<JsonRecord>
```

Search people (CRM records of the "people" object).

`opts?` (`PeopleListOpts`):
- `objectSlug?: string`
- `limit?: number`

### `u.people.list`

```ts
list(opts?: PeopleListOpts): Promise<JsonRecord>
```

List people without a query — the CRUD-style entry point agents expect for
symmetry with `work.records`. Delegates to `search` with an empty query
(the people domain is search-backed; there is no separate list endpoint).

`opts?` (`PeopleListOpts`):
- `objectSlug?: string`
- `limit?: number`

## research

Open-web search (server-side proxy).

### `u.research.search`

```ts
search(query: string): Promise<ResearchResult[]>
```

Web search via the server's web-search proxy. This is the only route to the
open web — the search runs server-side. Use it to verify a claim or gather
external facts before writing.


# Unison SDK — agent method reference (v1.3.1)

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

### `u.grep`

```ts
grep(pattern: string, opts?: GrepOptions): Promise<BrainDocument[]>
```

### `u.get`

```ts
get(path: string): Promise<BrainDocument>
```

### `u.list`

```ts
list(opts?: ListOptions): Promise<BrainDocument[]>
```

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

### `u.delete`

```ts
delete(path: string): Promise<{ deleted: boolean; }>
```

### `u.tag`

```ts
tag(path: string, input: TagInput): Promise<BrainDocument>
```

### `u.share`

```ts
share(kind: ShareKind, id: string): Promise<{ shared: boolean; }>
```

### `u.neighbors`

```ts
neighbors(idOrPath: string, opts?: NeighborsOptions): Promise<BrainDocument[]>
```

### `u.status`

```ts
status(): Promise<BrainStatus>
```

### `u.whoami`

```ts
whoami(): Promise<WhoAmI>
```

## entities

Knowledge-graph entities (people, companies, projects, …).

### `u.entities.list`

```ts
list(opts?: ListEntitiesOptions): Promise<BrainEntity[]>
```

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

### `u.facts.timeline`

```ts
timeline(entityId: string, opts?: TimelineOptions): Promise<BrainFact[]>
```

### `u.facts.record`

```ts
record(input: RecordFactInput): Promise<BrainFact>
```

### `u.facts.correct`

```ts
correct(factId: string, input: CorrectFactInput): Promise<BrainFact>
```

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

### `u.work.applyDryRun`

```ts
applyDryRun(input: Omit<WorkApplyInput, "dryRun">): Promise<JsonRecord>
```

Validate operations WITHOUT writing — the dedicated, discoverable dry-run
entry point. Same shape + result as `apply`; routes to
`/v1/work/apply:dry-run`. Prefer this over `apply({ dryRun: true })`.

### `u.work.query`

```ts
query(input: WorkQueryInput): Promise<JsonRecord>
```

Query a Work view by id (filters / sorts come from `query`).

### `u.work.records`

```ts
records(input: WorkRecordsInput): Promise<JsonRecord>
```

List the records of a table directly — no view needed. Pass `tableId` for any
table, or `semanticKind` (company/person/deal/task) to read the canonical
CRM/Tasks table without first discovering its id. Use this to list/count/
summarize the CRM (it is tenant-scoped and never appears in `tree()`).

### `u.work.search`

```ts
search(input: WorkSearchInput): Promise<JsonRecord>
```

Search folders, artifacts, documents, tables, records, and assets.

### `u.work.inspect`

```ts
inspect(input: WorkInspectInput): Promise<JsonRecord>
```

Inspect a single primitive by kind + id.

### `u.work.tree`

```ts
tree(input?: WorkTreeInput): Promise<JsonRecord>
```

Read the folder + artifact tree (optionally scoped to a team space).

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

### `u.mail.thread`

```ts
thread(id: string, opts?: { allowImages?: boolean; }): Promise<JsonRecord>
```

### `u.mail.send`

```ts
send(input: MailSendInput): Promise<JsonRecord>
```

### `u.mail.draft`

```ts
draft(input: MailDraftInput): Promise<JsonRecord>
```

Draft an email into the in-app review surface (`app:emails`) for the user to
review, edit, approve/send, or discard — the human-in-the-loop email flow.
Use this for ALL drafting (new emails AND replies via `replyToThreadId`).
Drafting needs no Gmail connection; sending (from the surface) does. This is
the only draft path — there is no "save to Gmail Drafts" tool.

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

### `u.chat.send`

```ts
send(input: ChatSendInput): Promise<JsonRecord>
```

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

## people

CRM people search.

### `u.people.search`

```ts
search(query: string, opts?: PeopleListOpts): Promise<JsonRecord>
```

Search people (CRM records of the "people" object).

### `u.people.list`

```ts
list(opts?: PeopleListOpts): Promise<JsonRecord>
```

List people without a query — the CRUD-style entry point agents expect for
symmetry with `work.records`. Delegates to `search` with an empty query
(the people domain is search-backed; there is no separate list endpoint).

## research

Open-web search (server-side proxy).

### `u.research.search`

```ts
search(query: string): Promise<ResearchResult[]>
```

Web search via the server's web-search proxy. This is the only route to the
open web — the search runs server-side. Use it to verify a claim or gather
external facts before writing.


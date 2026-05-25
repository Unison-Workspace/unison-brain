import type { RequestFn } from "./domains/_request";
import { type CalendarApi, createCalendarApi } from "./domains/calendar";
import { type ChatApi, createChatApi } from "./domains/chat";
import { type CrmApi, createCrmApi } from "./domains/crm";
import { type MailApi, createMailApi } from "./domains/mail";
import { type PeopleApi, createPeopleApi } from "./domains/people";
import { type TasksApi, createTasksApi } from "./domains/tasks";
import { type WorkspaceApi, createWorkspaceApi } from "./domains/workspace";
import { API_VERSION, parseResponse, qs, stripTrailingSlash } from "./http";
import type {
  BrainClientOptions,
  BrainDocument,
  BrainEntity,
  BrainFact,
  BrainJob,
  BrainLink,
  BrainStatus,
  CorrectFactInput,
  EntityKind,
  FactsAboutOptions,
  FsEntry,
  GrepOptions,
  JobStats,
  ListEntitiesOptions,
  ListJobsOptions,
  ListOptions,
  MatchConflict,
  MatchVerdict,
  MergeEvent,
  NeighborsOptions,
  RecordFactInput,
  SearchOptions,
  SearchResult,
  ShareKind,
  TagInput,
  TimelineOptions,
  UpsertEntityInput,
  WhoAmI,
  WriteInput,
} from "./types";

export interface EntitiesApi {
  list(opts?: ListEntitiesOptions): Promise<BrainEntity[]>;
  resolve(name: string, kindHint?: EntityKind): Promise<BrainEntity | null>;
  get(id: string): Promise<BrainEntity>;
  upsert(input: UpsertEntityInput): Promise<BrainEntity>;
}

export interface FactsApi {
  list(opts?: { limit?: number; includeInvalidated?: boolean }): Promise<BrainFact[]>;
  about(entityId: string, opts?: FactsAboutOptions): Promise<BrainFact[]>;
  timeline(entityId: string, opts?: TimelineOptions): Promise<BrainFact[]>;
  record(input: RecordFactInput): Promise<BrainFact>;
  correct(factId: string, input: CorrectFactInput): Promise<BrainFact>;
  invalidate(factId: string): Promise<{ invalidated: boolean }>;
}

export interface LinksApi {
  list(limit?: number): Promise<BrainLink[]>;
  create(fromId: string, toId: string, kind: string): Promise<void>;
}

export interface ReviewApi {
  conflicts(): Promise<MatchConflict[]>;
  resolve(conflictId: string, verdict: MatchVerdict): Promise<{ ok: true }>;
  merges(limit?: number): Promise<MergeEvent[]>;
  undo(mergeEventId: string): Promise<{ ok: true }>;
}

export interface JobsApi {
  list(opts?: ListJobsOptions): Promise<BrainJob[]>;
  stats(): Promise<JobStats>;
  retry(jobId: string): Promise<{ retried: boolean }>;
}

export class BrainClient {
  readonly entities: EntitiesApi;
  readonly facts: FactsApi;
  readonly links: LinksApi;
  readonly review: ReviewApi;
  readonly jobs: JobsApi;

  // Domain APIs over the same /v1 surface (Phase G).
  readonly tasks: TasksApi;
  readonly workspace: WorkspaceApi;
  readonly mail: MailApi;
  readonly chat: ChatApi;
  readonly crm: CrmApi;
  readonly calendar: CalendarApi;
  readonly people: PeopleApi;

  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: BrainClientOptions) {
    this.baseUrl = stripTrailingSlash(opts.baseUrl);
    this.token = opts.token;
    this.fetchImpl = opts.fetch ?? fetch;

    this.entities = {
      list: (o = {}) =>
        this.req<{ entities: BrainEntity[] }>(
          "GET",
          `/brain/entities?${qs({ kind: o.kinds, status: o.status, limit: o.limit })}`,
        ).then((d) => d.entities),
      resolve: (name, kindHint) =>
        this.req<{ entity: BrainEntity | null }>(
          "GET",
          `/brain/entities/resolve?${qs({ name, kindHint })}`,
        ).then((d) => d.entity),
      get: (id) => this.req<BrainEntity>("GET", `/brain/entities/${encodeURIComponent(id)}`),
      upsert: (input) => this.req<BrainEntity>("POST", "/brain/entities", input),
    };

    this.facts = {
      list: (o = {}) =>
        this.req<{ facts: BrainFact[] }>(
          "GET",
          `/brain/facts?${qs({ limit: o.limit, includeInvalidated: o.includeInvalidated })}`,
        ).then((d) => d.facts),
      about: (entityId, o = {}) =>
        this.req<{ facts: BrainFact[] }>(
          "GET",
          `/brain/entities/${encodeURIComponent(entityId)}/facts?${qs({ asOf: o.asOf, includeInvalidated: o.includeInvalidated })}`,
        ).then((d) => d.facts),
      timeline: (entityId, o = {}) =>
        this.req<{ facts: BrainFact[] }>(
          "GET",
          `/brain/entities/${encodeURIComponent(entityId)}/timeline?${qs({ from: o.from, to: o.to })}`,
        ).then((d) => d.facts),
      record: (input) => this.req<BrainFact>("POST", "/brain/facts", input),
      correct: (factId, input) =>
        this.req<BrainFact>("PATCH", `/brain/facts/${encodeURIComponent(factId)}`, input),
      invalidate: (factId) =>
        this.req<{ invalidated: boolean }>("DELETE", `/brain/facts/${encodeURIComponent(factId)}`),
    };

    this.links = {
      list: (limit) =>
        this.req<{ links: BrainLink[] }>("GET", `/brain/links?${qs({ limit })}`).then(
          (d) => d.links,
        ),
      create: (fromId, toId, kind) =>
        this.req<void>("POST", "/brain/links", { fromId, toId, kind }),
    };

    this.review = {
      conflicts: () =>
        this.req<{ conflicts: MatchConflict[] }>("GET", "/brain/review/conflicts").then(
          (d) => d.conflicts,
        ),
      resolve: (conflictId, verdict) =>
        this.req<{ ok: true }>(
          "POST",
          `/brain/review/conflicts/${encodeURIComponent(conflictId)}`,
          { verdict },
        ),
      merges: (limit) =>
        this.req<{ merges: MergeEvent[] }>("GET", `/brain/review/merges?${qs({ limit })}`).then(
          (d) => d.merges,
        ),
      undo: (mergeEventId) =>
        this.req<{ ok: true }>(
          "POST",
          `/brain/review/merges/${encodeURIComponent(mergeEventId)}/undo`,
        ),
    };

    this.jobs = {
      list: (o = {}) =>
        this.req<{ jobs: BrainJob[] }>(
          "GET",
          `/brain/jobs?${qs({ status: o.status, kind: o.kind, limit: o.limit })}`,
        ).then((d) => d.jobs),
      stats: () => this.req<JobStats>("GET", "/brain/jobs/stats"),
      retry: (jobId) =>
        this.req<{ retried: boolean }>("POST", `/brain/jobs/${encodeURIComponent(jobId)}/retry`),
    };

    // Domain APIs share the same transport (prefixes /v1).
    const request: RequestFn = (method, path, body) => this.req(method, path, body);
    this.tasks = createTasksApi(request);
    this.workspace = createWorkspaceApi(request);
    this.mail = createMailApi(request);
    this.chat = createChatApi(request);
    this.crm = createCrmApi(request);
    this.calendar = createCalendarApi(request);
    this.people = createPeopleApi(request);
  }

  // ── Documents ──────────────────────────────────────────────────────────

  async search(query: string, opts: SearchOptions = {}): Promise<SearchResult[]> {
    const data = await this.req<{ results: SearchResult[] }>(
      "GET",
      `/brain/search?${qs({ q: query, k: opts.limit, kind: opts.kinds, tag: opts.tags, memoryType: opts.memoryType, asOf: opts.asOf })}`,
    );
    return data.results;
  }

  async grep(pattern: string, opts: GrepOptions = {}): Promise<BrainDocument[]> {
    const data = await this.req<{ results: BrainDocument[] }>(
      "GET",
      `/brain/grep?${qs({ pattern, caseSensitive: opts.caseSensitive, limit: opts.limit })}`,
    );
    return data.results;
  }

  get(path: string, asOf?: string): Promise<BrainDocument> {
    return this.req<BrainDocument>("GET", `/brain/doc?${qs({ path, asOf })}`);
  }

  async list(opts: ListOptions = {}): Promise<BrainDocument[]> {
    const data = await this.req<{ documents: BrainDocument[] }>(
      "GET",
      `/brain/list?${qs({ prefix: opts.prefix, kind: opts.kinds, tag: opts.tags, limit: opts.limit })}`,
    );
    return data.documents;
  }

  async listFs(path = ""): Promise<FsEntry[]> {
    const data = await this.req<{ entries: FsEntry[] }>("GET", `/brain/fs?${qs({ path })}`);
    return data.entries;
  }

  getRaw(path: string): Promise<{ content: string | null; path: string }> {
    return this.req<{ content: string | null; path: string }>(
      "GET",
      `/brain/fs/read?${qs({ path })}`,
    );
  }

  write(input: WriteInput): Promise<BrainDocument> {
    return this.req<BrainDocument>("PUT", "/brain/doc", input);
  }

  delete(path: string): Promise<{ deleted: boolean }> {
    return this.req<{ deleted: boolean }>("DELETE", `/brain/doc?${qs({ path })}`);
  }

  tag(path: string, input: TagInput): Promise<BrainDocument> {
    return this.req<BrainDocument>("POST", "/brain/doc/tag", { path, ...input });
  }

  share(kind: ShareKind, id: string): Promise<{ shared: boolean }> {
    return this.req<{ shared: boolean }>("POST", "/brain/share", { kind, id });
  }

  async neighbors(idOrPath: string, opts: NeighborsOptions = {}): Promise<BrainDocument[]> {
    const data = await this.req<{ documents: BrainDocument[] }>(
      "GET",
      `/brain/neighbors?${qs({ idOrPath, kind: opts.kinds, limit: opts.limit })}`,
    );
    return data.documents;
  }

  status(): Promise<BrainStatus> {
    return this.req<BrainStatus>("GET", "/brain/status");
  }

  whoami(): Promise<WhoAmI> {
    return this.req<WhoAmI>("GET", "/auth/whoami");
  }

  // ── transport ──────────────────────────────────────────────────────────

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    if (body !== undefined) headers["content-type"] = "application/json";

    const res = await this.fetchImpl(`${this.baseUrl}/${API_VERSION}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return parseResponse<T>(res);
  }
}

export interface BrainClientOptions {
  /** Base URL of the Unison API, e.g. https://api.unison.computer */
  baseUrl: string;
  /** Bearer token: an API key (`usk_...`) or a browser-login access token. */
  token?: string;
  /** Override the fetch implementation (used in tests). */
  fetch?: typeof fetch;
}

// ── Documents (filesystem tier) ────────────────────────────────────────────

export type DocKind = "wiki_page" | "raw" | "note" | "log" | "index" | "skill" | "skill_proposed";
export type Visibility = "tenant" | "private";
export type MemoryType = "episodic" | "semantic" | "procedural" | "auto";

export interface BrainDocument {
  id: string;
  path: string;
  kind: string;
  title: string | null;
  tldr: string | null;
  bodyMd: string;
  tags: string[];
  visibility: Visibility;
  updatedAt: string | null;
  contentHash?: string | null;
}

export interface SearchResult extends BrainDocument {
  score: number;
}

export interface FsEntry {
  type: "dir" | "file";
  path: string;
  name: string;
  mtime: string | null;
}

export interface SearchOptions {
  limit?: number;
  kinds?: DocKind[];
  tags?: string[];
  memoryType?: MemoryType;
  asOf?: string;
}

export interface GrepOptions {
  caseSensitive?: boolean;
  limit?: number;
}

export interface ListOptions {
  prefix?: string;
  kinds?: DocKind[];
  tags?: string[];
  limit?: number;
}

export interface WriteInput {
  path: string;
  bodyMd: string;
  kind?: DocKind;
  title?: string;
  tldr?: string;
  tags?: string[];
  visibility?: Visibility;
  expectedContentHash?: string;
  source?: { kind: string; ref: string };
}

export interface TagInput {
  add?: string[];
  remove?: string[];
}

export type ShareKind = "doc" | "fact" | "entity";

// ── Entities (knowledge graph) ─────────────────────────────────────────────

export type EntityKind =
  | "person"
  | "company"
  | "project"
  | "decision"
  | "topic"
  | "mail_thread"
  | "event"
  | "task"
  | "doc";
export type EntityStatus = "active" | "stub" | "archived";

export interface BrainEntity {
  id: string;
  kind: string;
  displayName: string;
  slug: string | null;
  aliases: string[];
  props: Record<string, unknown>;
  status: EntityStatus;
}

export interface ListEntitiesOptions {
  kinds?: string[];
  status?: EntityStatus;
  limit?: number;
}

export interface UpsertEntityInput {
  kind: EntityKind;
  displayName: string;
  slug?: string;
  aliases?: string[];
  props?: Record<string, unknown>;
  status?: EntityStatus;
}

// ── Facts (bitemporal) ─────────────────────────────────────────────────────

export interface BrainFact {
  id: string;
  subjectId: string;
  predicate: string;
  factText: string;
  objectJson: unknown | null;
  objectEntityId: string | null;
  validFrom: string | null;
  validTo: string | null;
  confidence: number;
}

export interface RecordFactInput {
  subjectId: string;
  predicate: string;
  factText: string;
  objectJson?: unknown;
  objectEntityId?: string;
  validFrom?: string;
  validTo?: string;
  confidence?: number;
  supersedesId?: string;
}

export interface CorrectFactInput {
  predicate?: string;
  factText?: string;
  objectJson?: unknown;
  objectEntityId?: string;
  confidence?: number;
}

export interface FactsAboutOptions {
  asOf?: string;
  includeInvalidated?: boolean;
}

export interface TimelineOptions {
  from?: string;
  to?: string;
}

// ── Links (graph edges) ────────────────────────────────────────────────────

export type LinkKind = "mentions" | "derived_from" | "supersedes" | "see_also";

export interface BrainLink {
  fromId: string;
  toId: string;
  kind: string;
}

export interface NeighborsOptions {
  kinds?: LinkKind[];
  limit?: number;
}

// ── Dedup review ───────────────────────────────────────────────────────────

export interface MatchConflict {
  id: string;
  pairType: string;
  aId: string;
  bId: string;
  engineReasoning: string;
  engineVerdict: string;
  calibratedConfidence: number;
  aDescription: string;
  bDescription: string;
  exemplars: unknown[];
}

export interface MergeEvent {
  id: string;
  type: string;
  survivorId: string;
  loserId: string;
  decidedBy: string;
  judgeReasoning: string;
  createdAt: string;
  survivorName: string;
  loserName: string;
}

export type MatchVerdict = "merge" | "distinct";

// ── Jobs (operator) ────────────────────────────────────────────────────────

export type JobStatus = "pending" | "running" | "done" | "failed" | "skipped";

export interface BrainJob {
  id: string;
  kind: string;
  lane: string;
  priority: number;
  status: JobStatus;
  attempt: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobStats {
  pending: number;
  running: number;
  done: number;
  failed: number;
  skipped: number;
}

export interface ListJobsOptions {
  status?: JobStatus;
  kind?: string;
  limit?: number;
}

// ── Status / identity ──────────────────────────────────────────────────────

export interface BrainStatus {
  docCount: number;
  docWithEmbedding: number;
  entityCount: number;
  factCount: number;
  lastIngestAt: string | null;
  pendingJobs: number;
  staleWikiPageCount: number;
}

export interface WhoAmI {
  user: { id: string; email: string | null };
  tenant: { id: string; name: string | null };
  scopes: string[];
}

// ── Auth ───────────────────────────────────────────────────────────────────

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  scope: string;
}

export interface PkcePair {
  verifier: string;
  challenge: string;
}

export interface AuthorizeUrlParams {
  clientId?: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  scopes?: string[];
}

export interface ExchangeCodeParams {
  code: string;
  verifier: string;
  redirectUri: string;
  clientId?: string;
}

export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  interval: number;
  expiresIn: number;
}

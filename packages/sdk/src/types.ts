export interface BrainClientOptions {
  /** Base URL of the Unison API, e.g. https://api.unison.computer */
  baseUrl: string;
  /** Bearer token: an API key (`usk_...`) or a device-flow access token. */
  token?: string;
  /** Override the fetch implementation (used in tests). */
  fetch?: typeof fetch;
}

export interface SearchOptions {
  /** Max number of results. */
  limit?: number;
  /** Restrict to a document kind (e.g. "note", "wiki", "decision"). */
  kind?: string;
  /** Restrict to documents carrying this tag. */
  tag?: string;
}

export interface SearchResult {
  path: string;
  title: string | null;
  snippet: string;
  score: number;
  kind: string;
  tags: string[];
}

export interface BrainDocument {
  path: string;
  title: string | null;
  content: string;
  kind: string;
  tags: string[];
  updatedAt: string;
}

export interface ListItem {
  path: string;
  title: string | null;
  kind: string;
  updatedAt: string;
}

export interface WriteInput {
  path: string;
  content: string;
  kind?: string;
  tags?: string[];
}

export interface BrainStatus {
  documents: number;
  entities: number;
  facts: number;
  pendingJobs: number;
}

export interface WhoAmI {
  user: { id: string; email: string | null };
  tenant: { id: string; name: string | null };
  scopes: string[];
}

export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  interval: number;
  expiresIn: number;
}

export interface DeviceTokenResponse {
  accessToken: string;
  tokenType: string;
  scope: string;
}

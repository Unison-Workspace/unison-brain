import { API_VERSION, parseResponse, stripTrailingSlash } from "./http";
import type {
  BrainClientOptions,
  BrainDocument,
  BrainStatus,
  ListItem,
  SearchOptions,
  SearchResult,
  WhoAmI,
  WriteInput,
} from "./types";

export class BrainClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: BrainClientOptions) {
    this.baseUrl = stripTrailingSlash(opts.baseUrl);
    this.token = opts.token;
    this.fetchImpl = opts.fetch ?? fetch;
  }

  async search(query: string, opts: SearchOptions = {}): Promise<SearchResult[]> {
    const params = new URLSearchParams({ q: query });
    if (opts.limit) params.set("k", String(opts.limit));
    if (opts.kind) params.set("kind", opts.kind);
    if (opts.tag) params.set("tag", opts.tag);
    const data = await this.request<{ results: SearchResult[] }>(
      "GET",
      `/brain/search?${params.toString()}`,
    );
    return data.results;
  }

  async get(path: string): Promise<BrainDocument> {
    const params = new URLSearchParams({ path });
    return this.request<BrainDocument>("GET", `/brain/doc?${params.toString()}`);
  }

  async write(input: WriteInput): Promise<BrainDocument> {
    return this.request<BrainDocument>("PUT", "/brain/doc", input);
  }

  async list(prefix = "", limit = 100): Promise<ListItem[]> {
    const params = new URLSearchParams();
    if (prefix) params.set("prefix", prefix);
    params.set("limit", String(limit));
    const data = await this.request<{ items: ListItem[] }>(
      "GET",
      `/brain/list?${params.toString()}`,
    );
    return data.items;
  }

  async status(): Promise<BrainStatus> {
    return this.request<BrainStatus>("GET", "/brain/status");
  }

  async whoami(): Promise<WhoAmI> {
    return this.request<WhoAmI>("GET", "/auth/whoami");
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
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

import { qs } from "../http";
import type { RequestFn } from "./_request";

/** One web search hit returned by the server's web-search proxy. */
export interface ResearchResult {
  url: string;
  title: string;
  snippet: string;
  /** Publish/era date when the source exposes one. */
  date?: string;
}

export interface ResearchApi {
  /**
   * Web search via the server's web-search proxy. This is the only route to the
   * open web — the search runs server-side. Use it to verify a claim or gather
   * external facts before writing.
   */
  search(query: string): Promise<ResearchResult[]>;
}

export function createResearchApi(req: RequestFn): ResearchApi {
  return {
    search: async (query) => {
      const data = await req<{ results: ResearchResult[] }>(
        "GET",
        `/research/search?${qs({ q: query })}`,
      );
      return data.results;
    },
  };
}

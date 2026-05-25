import { qs } from "../http";
import type { JsonRecord, RequestFn } from "./_request";

export interface PeopleApi {
  /** Search people (CRM records of the "people" object). */
  search(query: string, opts?: { objectSlug?: string; limit?: number }): Promise<JsonRecord>;
}

export function createPeopleApi(req: RequestFn): PeopleApi {
  return {
    search: (query, o = {}) =>
      req("GET", `/people/search?${qs({ q: query, objectSlug: o.objectSlug, limit: o.limit })}`),
  };
}

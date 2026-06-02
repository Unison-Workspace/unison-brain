import { qs } from "../http";
import type { JsonRecord, RequestFn } from "./_request";

export interface PeopleListOpts {
  objectSlug?: string;
  limit?: number;
}

export interface PeopleApi {
  /** Search people (CRM records of the "people" object). */
  search(query: string, opts?: PeopleListOpts): Promise<JsonRecord>;
  /**
   * List people without a query — the CRUD-style entry point agents expect for
   * symmetry with `work.records`. Delegates to `search` with an empty query
   * (the people domain is search-backed; there is no separate list endpoint).
   */
  list(opts?: PeopleListOpts): Promise<JsonRecord>;
}

export function createPeopleApi(req: RequestFn): PeopleApi {
  const search: PeopleApi["search"] = (query, o = {}) =>
    req("GET", `/people/search?${qs({ q: query, objectSlug: o.objectSlug, limit: o.limit })}`);
  return {
    search,
    list: (o = {}) => search("", o),
  };
}

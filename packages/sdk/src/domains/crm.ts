import { qs } from "../http";
import type { JsonRecord, RequestFn } from "./_request";

export interface CrmRecordSearchOptions {
  objectId?: string;
  objectSlug?: string;
  q?: string;
  limit?: number;
}

export interface CrmRecordCreateInput {
  objectId: string;
  displayName: string;
  avatarUrl?: string;
  primaryPhone?: string;
  ownerUserId?: string;
  values?: JsonRecord[];
}

export interface CrmRecordUpdateInput {
  displayName?: string;
  avatarUrl?: string;
  primaryPhone?: string;
  ownerUserId?: string;
}

export interface CrmNoteCreateInput {
  recordId: string;
  recordIds?: string[];
  title?: string | null;
  bodyMd: string;
  pinned?: boolean;
}

export interface CrmApi {
  objects(opts?: { includeArchived?: boolean }): Promise<JsonRecord[]>;
  searchRecords(opts?: CrmRecordSearchOptions): Promise<JsonRecord>;
  queryRecords(input: JsonRecord): Promise<JsonRecord>;
  record(id: string, opts?: { includeValues?: boolean }): Promise<JsonRecord>;
  createRecord(input: CrmRecordCreateInput): Promise<JsonRecord>;
  updateRecord(id: string, input: CrmRecordUpdateInput): Promise<JsonRecord>;
  lists(opts?: { parentObjectId?: string }): Promise<JsonRecord[]>;
  notes(recordId: string, opts?: { limit?: number }): Promise<JsonRecord[]>;
  createNote(input: CrmNoteCreateInput): Promise<JsonRecord>;
}

export function createCrmApi(req: RequestFn): CrmApi {
  return {
    objects: (o = {}) =>
      req<{ objects: JsonRecord[] }>(
        "GET",
        `/crm/objects?${qs({ includeArchived: o.includeArchived })}`,
      ).then((d) => d.objects),
    searchRecords: (o = {}) => req("GET", `/crm/records/search?${qs({ ...o })}`),
    queryRecords: (input) => req("POST", "/crm/records/query", input),
    record: (id, o = {}) =>
      req(
        "GET",
        `/crm/records/${encodeURIComponent(id)}?${qs({ includeValues: o.includeValues })}`,
      ),
    createRecord: (input) => req("POST", "/crm/records", input),
    updateRecord: (id, input) => req("PATCH", `/crm/records/${encodeURIComponent(id)}`, input),
    lists: (o = {}) =>
      req<{ lists: JsonRecord[] }>(
        "GET",
        `/crm/lists?${qs({ parentObjectId: o.parentObjectId })}`,
      ).then((d) => d.lists),
    notes: (recordId, o = {}) =>
      req<{ notes: JsonRecord[] }>("GET", `/crm/notes?${qs({ recordId, limit: o.limit })}`).then(
        (d) => d.notes,
      ),
    createNote: (input) => req("POST", "/crm/notes", input),
  };
}

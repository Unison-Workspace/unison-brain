import { BrainError } from "../errors";
import { qs } from "../http";
import type { JsonRecord, RequestFn } from "./_request";
import type {
  WorkApplyInput,
  WorkAssetCompleteInput,
  WorkAssetUploadUrlInput,
} from "./work-operations";

export type {
  WorkApplyInput,
  WorkAssetCompleteInput,
  WorkAssetUploadUrlInput,
  WorkOperation,
} from "./work-operations";

export interface WorkSearchInput {
  query: string;
  limit?: number;
}

export type WorkInspectKind =
  | "folder"
  | "artifact"
  | "document"
  | "table"
  | "record_set"
  | "view"
  | "asset";

export interface WorkInspectInput {
  kind: WorkInspectKind;
  id: string;
}

export interface WorkTreeInput {
  teamSpaceId?: string;
}

/** A view query config (filters / sorts / limit). Validated server-side; passed
 * through loosely so the SDK doesn't pin a fast-moving query-builder shape. */
export type WorkViewQuery = JsonRecord;

export interface WorkQueryInput {
  viewId: string;
  query?: WorkViewQuery;
}

export interface WorkAssetReadUrlOptions {
  /** Signed-URL lifetime in seconds (server default ~600s). */
  expiresIn?: number;
}

/** High-level upload input — `assets.upload` orchestrates the upload-url →
 * PUT → complete dance. Advanced callers can use the three primitives instead. */
export interface WorkAssetUploadInput {
  filename: string;
  mimeType: string;
  data: ArrayBuffer | Uint8Array | Blob;
  /** Defaults to the byte length of `data`. */
  sizeBytes?: number;
  displayName?: string;
  sha256?: string | null;
  metadata?: JsonRecord;
}

export interface WorkAssetsApi {
  uploadUrl(input: WorkAssetUploadUrlInput): Promise<JsonRecord>;
  create(input: WorkAssetCompleteInput): Promise<JsonRecord>;
  readUrl(id: string, opts?: WorkAssetReadUrlOptions): Promise<JsonRecord>;
  upload(input: WorkAssetUploadInput): Promise<JsonRecord>;
}

export interface WorkApi {
  /** Atomically apply Work primitive operations. Set `dryRun` to validate
   * without writing (routes to `/v1/work/apply:dry-run`). */
  apply(input: WorkApplyInput): Promise<JsonRecord>;
  /** Query a Work view by id (filters / sorts come from `query`). */
  query(input: WorkQueryInput): Promise<JsonRecord>;
  /** Search folders, artifacts, documents, tables, records, and assets. */
  search(input: WorkSearchInput): Promise<JsonRecord>;
  /** Inspect a single primitive by kind + id. */
  inspect(input: WorkInspectInput): Promise<JsonRecord>;
  /** Read the folder + artifact tree (optionally scoped to a team space). */
  tree(input?: WorkTreeInput): Promise<JsonRecord>;
  folder(id: string): Promise<JsonRecord>;
  artifact(id: string): Promise<JsonRecord>;
  tableSchema(id: string): Promise<JsonRecord>;
  viewQuery(id: string, query?: WorkViewQuery): Promise<JsonRecord>;
  assets: WorkAssetsApi;
}

interface PreparedUpload {
  assetId: string;
  storageBucket: string;
  storagePath: string;
  signedUrl: string | null;
  token: string | null;
}

function byteLength(data: ArrayBuffer | Uint8Array | Blob): number {
  if (typeof Blob !== "undefined" && data instanceof Blob) return data.size;
  if (data instanceof Uint8Array) return data.byteLength;
  return (data as ArrayBuffer).byteLength;
}

export function createWorkApi(req: RequestFn, rawFetch: typeof fetch): WorkApi {
  const assets: WorkAssetsApi = {
    uploadUrl: (input) => req("POST", "/work/assets/upload-url", input),
    create: (input) => req("POST", "/work/assets", input),
    readUrl: (id, o = {}) =>
      req(
        "GET",
        `/work/assets/${encodeURIComponent(id)}/read-url?${qs({ expiresIn: o.expiresIn })}`,
      ),
    upload: async (input) => {
      const sizeBytes = input.sizeBytes ?? byteLength(input.data);
      const prep = await req<PreparedUpload>("POST", "/work/assets/upload-url", {
        filename: input.filename,
        mimeType: input.mimeType,
        sizeBytes,
        displayName: input.displayName,
        metadata: input.metadata,
      });
      if (!prep.signedUrl) {
        throw new BrainError(
          "asset_upload_unavailable",
          "The server did not return a signed upload URL; asset storage may be unconfigured.",
          502,
        );
      }
      const put = await rawFetch(prep.signedUrl, {
        method: "PUT",
        headers: { "content-type": input.mimeType },
        body: input.data,
      });
      if (!put.ok) {
        throw new BrainError(
          "asset_upload_failed",
          `Asset upload failed with status ${put.status}.`,
          put.status,
        );
      }
      return req("POST", "/work/assets", {
        assetId: prep.assetId,
        storageBucket: prep.storageBucket,
        storagePath: prep.storagePath,
        originalFilename: input.filename,
        displayName: input.displayName ?? null,
        mimeType: input.mimeType,
        sizeBytes,
        sha256: input.sha256 ?? null,
        uploadToken: prep.token ?? undefined,
        metadata: input.metadata,
      });
    },
  };

  return {
    apply: (input) => req("POST", input.dryRun ? "/work/apply:dry-run" : "/work/apply", input),
    query: (input) =>
      req("POST", "/work/query", {
        viewId: input.viewId,
        ...(input.query ? { query: input.query } : {}),
      }),
    search: (input) => req("POST", "/work/search", input),
    inspect: (input) => req("POST", "/work/inspect", input),
    tree: (o = {}) => req("GET", `/work/tree?${qs({ teamSpaceId: o.teamSpaceId })}`),
    folder: (id) => req("GET", `/work/folders/${encodeURIComponent(id)}`),
    artifact: (id) => req("GET", `/work/artifacts/${encodeURIComponent(id)}`),
    tableSchema: (id) => req("GET", `/work/tables/${encodeURIComponent(id)}/schema`),
    viewQuery: (id, query) =>
      req("POST", `/work/views/${encodeURIComponent(id)}/query`, query ?? {}),
    assets,
  };
}

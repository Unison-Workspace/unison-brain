// Work operation DSL — type snapshot.
//
// These types mirror the canonical zod input schemas the server validates in
// `@unison/agent-shared`'s `work-operations.ts` (inputSchemaVersion 2026-05-26).
// The SDK lives in a separate repo from the Unison monorepo, so we can't import
// the inferred types directly. This file is a hand-maintained snapshot of the
// `z.input<>` shapes: regenerate it from agent-shared when the op DSL changes.
//
// We intentionally do NOT validate ops client-side. Each op carries an `op`
// literal that pins server compatibility; the server is the authority and
// returns a clear "unknown op" error for shapes it doesn't recognize, so a
// stale client snapshot degrades to a server-side error rather than silently
// rejecting a payload the server would accept.

/** A reference to a primitive: an existing UUID, or `{ ref }` pointing at an
 * earlier op's `ref` within the same `apply` batch. */
export type WorkIdOrRef = string | { ref: string };

export type WorkActorKind = "user" | "agent" | "system" | "migration";

export type WorkArtifactKind =
  | "document"
  | "table"
  | "board"
  | "kanban"
  | "calendar"
  | "timeline"
  | "gallery"
  | "form"
  | "dashboard"
  | "saved_output"
  | "external_ref";

export type WorkArtifactTargetKind = "document" | "view";

export type WorkFieldType =
  | "text"
  | "long_text"
  | "number"
  | "currency"
  | "date"
  | "timestamp"
  | "checkbox"
  | "select"
  | "multi_select"
  | "status"
  | "rating"
  | "url"
  | "email"
  | "phone"
  | "domain"
  | "location"
  | "user_reference"
  | "record_reference"
  | "asset"
  | "json";

export type WorkFieldScopeKind = "table" | "record_set";
export type WorkRecordSetMode = "all" | "manual" | "filter" | "relationship";
export type WorkViewSourceKind = "table" | "record_set";
export type WorkRendererKind =
  | "table"
  | "board"
  | "kanban"
  | "calendar"
  | "timeline"
  | "gallery"
  | "form"
  | "dashboard";
export type WorkRelationshipCardinality =
  | "one_to_one"
  | "one_to_many"
  | "many_to_one"
  | "many_to_many";
export type WorkRelationshipDeleteBehavior = "restrict" | "set_null" | "cascade_link";
export type WorkAssetLinkTargetKind =
  | "document"
  | "artifact"
  | "record"
  | "field_value"
  | "record_set_member"
  | "import"
  | "export";

export type WorkJsonObject = Record<string, unknown>;

/** Fields shared by every op: an optional in-batch `ref` and idempotency key. */
interface BaseOperation {
  ref?: string;
  idempotencyKey?: string;
}

export interface FolderCreateOperation extends BaseOperation {
  op: "folder.create";
  folderId?: string;
  name: string;
  teamSpaceId?: string;
  parentFolderId?: WorkIdOrRef | null;
  slug?: string;
  position?: number;
  metadata?: WorkJsonObject;
}

export interface FolderUpdateOperation extends BaseOperation {
  op: "folder.update";
  folderId: WorkIdOrRef;
  name?: string;
  slug?: string;
  metadata?: WorkJsonObject;
}

export interface FolderMoveOperation extends BaseOperation {
  op: "folder.move";
  folderId: WorkIdOrRef;
  parentFolderId?: WorkIdOrRef | null;
  position?: number;
}

export interface FolderArchiveOperation extends BaseOperation {
  op: "folder.archive";
  folderId: WorkIdOrRef;
}

export interface DocumentCreateOperation extends BaseOperation {
  op: "document.create";
  documentId?: string;
  title?: string;
  teamSpaceId?: string;
  folderId?: WorkIdOrRef;
  bodyMd?: string;
  bodyJson?: unknown;
  plainText?: string;
  metadata?: WorkJsonObject;
}

export interface DocumentUpdateOperation extends BaseOperation {
  op: "document.update";
  documentId: WorkIdOrRef;
  bodyMd?: string;
  bodyJson?: unknown;
  plainText?: string;
}

export interface TableCreateOperation extends BaseOperation {
  op: "table.create";
  tableId?: string;
  databaseId?: WorkIdOrRef;
  name: string;
  apiSlug?: string;
  singularLabel?: string;
  pluralLabel?: string;
  semanticKind?: string;
  icon?: string;
  metadata?: WorkJsonObject;
}

export interface TableUpdateOperation extends BaseOperation {
  op: "table.update";
  tableId: WorkIdOrRef;
  name?: string;
  apiSlug?: string;
  singularLabel?: string | null;
  pluralLabel?: string | null;
  semanticKind?: string | null;
  icon?: string | null;
  metadata?: WorkJsonObject;
}

export interface TableArchiveOperation extends BaseOperation {
  op: "table.archive";
  tableId: WorkIdOrRef;
}

export interface WorkFieldOptionInput {
  id?: string;
  apiSlug?: string;
  label: string;
  color?: string | null;
  position?: number;
  metadata?: WorkJsonObject;
}

export interface FieldCreateOperation extends BaseOperation {
  op: "field.create";
  fieldId?: string;
  tableId: WorkIdOrRef;
  recordSetId?: WorkIdOrRef;
  scopeKind?: WorkFieldScopeKind;
  name: string;
  apiSlug?: string;
  fieldType: WorkFieldType;
  semanticRole?: string | null;
  relationshipId?: WorkIdOrRef | null;
  isPrimary?: boolean;
  isRequired?: boolean;
  isUnique?: boolean;
  isMultiselect?: boolean;
  config?: WorkJsonObject;
  defaultValue?: unknown;
  position?: number;
  options?: WorkFieldOptionInput[];
}

export interface FieldUpdateOperation extends BaseOperation {
  op: "field.update";
  fieldId: WorkIdOrRef;
  name?: string;
  apiSlug?: string;
  semanticRole?: string | null;
  isRequired?: boolean;
  isUnique?: boolean;
  config?: WorkJsonObject;
  defaultValue?: unknown;
  position?: number;
}

export interface FieldArchiveOperation extends BaseOperation {
  op: "field.archive";
  fieldId: WorkIdOrRef;
}

export interface FieldReorderOperation extends BaseOperation {
  op: "field.reorder";
  tableId: WorkIdOrRef;
  fieldIds: WorkIdOrRef[];
}

export interface OptionUpsertOperation extends BaseOperation {
  op: "option.upsert";
  fieldId: WorkIdOrRef;
  id?: string;
  apiSlug?: string;
  label: string;
  color?: string | null;
  position?: number;
  metadata?: WorkJsonObject;
}

export interface OptionReorderOperation extends BaseOperation {
  op: "option.reorder";
  fieldId: WorkIdOrRef;
  optionIds: WorkIdOrRef[];
}

export interface OptionArchiveOperation extends BaseOperation {
  op: "option.archive";
  optionId: WorkIdOrRef;
}

export interface RelationshipCreateOperation extends BaseOperation {
  op: "relationship.create";
  relationshipId?: string;
  sourceTableId: WorkIdOrRef;
  targetTableId: WorkIdOrRef;
  sourceFieldId?: WorkIdOrRef | null;
  inverseFieldId?: WorkIdOrRef | null;
  cardinality: WorkRelationshipCardinality;
  deleteBehavior?: WorkRelationshipDeleteBehavior;
  isRequired?: boolean;
  metadata?: WorkJsonObject;
}

export interface RelationshipUpdateOperation extends BaseOperation {
  op: "relationship.update";
  relationshipId: WorkIdOrRef;
  sourceFieldId?: WorkIdOrRef | null;
  inverseFieldId?: WorkIdOrRef | null;
  deleteBehavior?: WorkRelationshipDeleteBehavior;
  isRequired?: boolean;
  metadata?: WorkJsonObject;
}

export interface RelationshipArchiveOperation extends BaseOperation {
  op: "relationship.archive";
  relationshipId: WorkIdOrRef;
}

export interface LinkUpsertOperation extends BaseOperation {
  op: "link.upsert";
  linkId?: string;
  relationshipId: WorkIdOrRef;
  sourceRecordId: WorkIdOrRef;
  targetRecordId: WorkIdOrRef;
  position?: number | null;
  metadata?: WorkJsonObject;
}

export interface LinkDeleteOperation extends BaseOperation {
  op: "link.delete";
  linkId?: WorkIdOrRef;
  relationshipId?: WorkIdOrRef;
  sourceRecordId?: WorkIdOrRef;
  targetRecordId?: WorkIdOrRef;
}

export interface RecordUpsertOperation extends BaseOperation {
  op: "record.upsert";
  tableId: WorkIdOrRef;
  recordId?: string;
  primaryText?: string;
  values?: WorkJsonObject;
  metadata?: WorkJsonObject;
}

export interface RecordArchiveOperation extends BaseOperation {
  op: "record.archive";
  recordId: WorkIdOrRef;
}

export interface CellSetOperation extends BaseOperation {
  op: "cell.set";
  recordId: WorkIdOrRef;
  fieldId: WorkIdOrRef;
  value: unknown;
}

export interface CellClearOperation extends BaseOperation {
  op: "cell.clear";
  recordId: WorkIdOrRef;
  fieldId: WorkIdOrRef;
}

export interface CellBatchSetOperation extends BaseOperation {
  op: "cell.batch_set";
  recordId: WorkIdOrRef;
  values?: WorkJsonObject;
}

export interface RecordSetCellSetOperation extends BaseOperation {
  op: "record_set_cell.set";
  recordSetId: WorkIdOrRef;
  memberId: WorkIdOrRef;
  fieldId: WorkIdOrRef;
  value: unknown;
}

export interface RecordSetCellClearOperation extends BaseOperation {
  op: "record_set_cell.clear";
  recordSetId: WorkIdOrRef;
  memberId: WorkIdOrRef;
  fieldId: WorkIdOrRef;
}

export interface RecordSetCreateOperation extends BaseOperation {
  op: "record_set.create";
  recordSetId?: string;
  tableId: WorkIdOrRef;
  name: string;
  apiSlug?: string | null;
  mode?: WorkRecordSetMode;
  filterConfig?: WorkJsonObject;
  relationshipConfig?: WorkJsonObject;
  metadata?: WorkJsonObject;
}

export interface RecordSetUpdateOperation extends BaseOperation {
  op: "record_set.update";
  recordSetId: WorkIdOrRef;
  name?: string;
  apiSlug?: string | null;
  filterConfig?: WorkJsonObject;
  relationshipConfig?: WorkJsonObject;
  metadata?: WorkJsonObject;
}

export interface RecordSetArchiveOperation extends BaseOperation {
  op: "record_set.archive";
  recordSetId: WorkIdOrRef;
}

export interface RecordSetMemberAddOperation extends BaseOperation {
  op: "record_set.member.add";
  memberId?: string;
  recordSetId: WorkIdOrRef;
  recordId: WorkIdOrRef;
  position?: number | null;
  groupKey?: string | null;
  metadata?: WorkJsonObject;
}

export interface RecordSetMemberRemoveOperation extends BaseOperation {
  op: "record_set.member.remove";
  memberId?: WorkIdOrRef;
  recordSetId?: WorkIdOrRef;
  recordId?: WorkIdOrRef;
}

export interface RecordSetMemberMoveOperation extends BaseOperation {
  op: "record_set.member.move";
  memberId: WorkIdOrRef;
  position: number;
  groupKey?: string | null;
}

export interface ViewCreateOperation extends BaseOperation {
  op: "view.create";
  viewId?: string;
  sourceKind?: WorkViewSourceKind;
  tableId: WorkIdOrRef;
  recordSetId?: WorkIdOrRef | null;
  name: string;
  rendererKind?: WorkRendererKind;
  queryConfig?: WorkJsonObject;
  sortConfig?: unknown[];
  groupByFieldId?: WorkIdOrRef | null;
  rendererConfig?: WorkJsonObject;
  metadata?: WorkJsonObject;
}

export interface ViewUpdateOperation extends BaseOperation {
  op: "view.update";
  viewId: WorkIdOrRef;
  name?: string;
  queryConfig?: WorkJsonObject;
  sortConfig?: unknown[];
  groupByFieldId?: WorkIdOrRef | null;
  rendererConfig?: WorkJsonObject;
  metadata?: WorkJsonObject;
}

export interface ViewArchiveOperation extends BaseOperation {
  op: "view.archive";
  viewId: WorkIdOrRef;
}

export interface ArtifactMountOperation extends BaseOperation {
  op: "artifact.mount";
  artifactId?: string;
  folderId?: WorkIdOrRef | null;
  teamSpaceId?: string;
  title: string;
  artifactKind: WorkArtifactKind;
  targetKind: WorkArtifactTargetKind;
  targetId: WorkIdOrRef;
  summary?: string | null;
  metadata?: WorkJsonObject;
}

export interface ArtifactUpdateOperation extends BaseOperation {
  op: "artifact.update";
  artifactId: WorkIdOrRef;
  title?: string;
  summary?: string | null;
  metadata?: WorkJsonObject;
}

export interface ArtifactMoveOperation extends BaseOperation {
  op: "artifact.move";
  artifactId: WorkIdOrRef;
  folderId: WorkIdOrRef | null;
}

export interface ArtifactArchiveOperation extends BaseOperation {
  op: "artifact.archive";
  artifactId: WorkIdOrRef;
}

export interface AssetPrepareUploadOperation extends BaseOperation {
  op: "asset.prepare_upload";
  assetId?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  displayName?: string;
  metadata?: WorkJsonObject;
}

export interface AssetCompleteUploadOperation extends BaseOperation {
  op: "asset.complete_upload";
  assetId: WorkIdOrRef;
  storageBucket?: string;
  storagePath: string;
  originalFilename: string;
  displayName?: string | null;
  mimeType: string;
  sizeBytes: number;
  sha256?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  uploadToken?: string;
  metadata?: WorkJsonObject;
}

export interface AssetAttachOperation extends BaseOperation {
  op: "asset.attach";
  linkId?: WorkIdOrRef;
  assetId: WorkIdOrRef;
  targetKind: WorkAssetLinkTargetKind;
  targetId: WorkIdOrRef;
  metadata?: WorkJsonObject;
}

export interface AssetUnlinkOperation extends BaseOperation {
  op: "asset.unlink";
  linkId: WorkIdOrRef;
}

export interface ModulePresentOperation extends BaseOperation {
  op: "module.present";
  artifactId: WorkIdOrRef;
  moduleKind?: WorkArtifactKind;
  title?: string;
  metadata?: WorkJsonObject;
}

/** The discriminated union of every Work primitive operation. */
export type WorkOperation =
  | FolderCreateOperation
  | FolderUpdateOperation
  | FolderMoveOperation
  | FolderArchiveOperation
  | DocumentCreateOperation
  | DocumentUpdateOperation
  | TableCreateOperation
  | TableUpdateOperation
  | TableArchiveOperation
  | FieldCreateOperation
  | FieldUpdateOperation
  | FieldArchiveOperation
  | FieldReorderOperation
  | OptionUpsertOperation
  | OptionReorderOperation
  | OptionArchiveOperation
  | RelationshipCreateOperation
  | RelationshipUpdateOperation
  | RelationshipArchiveOperation
  | LinkUpsertOperation
  | LinkDeleteOperation
  | RecordUpsertOperation
  | RecordArchiveOperation
  | CellSetOperation
  | CellClearOperation
  | CellBatchSetOperation
  | RecordSetCellSetOperation
  | RecordSetCellClearOperation
  | RecordSetCreateOperation
  | RecordSetUpdateOperation
  | RecordSetArchiveOperation
  | RecordSetMemberAddOperation
  | RecordSetMemberRemoveOperation
  | RecordSetMemberMoveOperation
  | ViewCreateOperation
  | ViewUpdateOperation
  | ViewArchiveOperation
  | ArtifactMountOperation
  | ArtifactUpdateOperation
  | ArtifactMoveOperation
  | ArtifactArchiveOperation
  | AssetPrepareUploadOperation
  | AssetCompleteUploadOperation
  | AssetAttachOperation
  | AssetUnlinkOperation
  | ModulePresentOperation;

/** Discriminant literal for any Work operation. */
export type WorkOperationName = WorkOperation["op"];

/** Body of `POST /v1/work/apply` (and `:dry-run`). */
export interface WorkApplyInput {
  operations: WorkOperation[];
  dryRun?: boolean;
  idempotencyKey?: string;
}

/** Body of `POST /v1/work/assets/upload-url` — `asset.prepare_upload` minus `op`. */
export type WorkAssetUploadUrlInput = Omit<AssetPrepareUploadOperation, "op">;

/** Body of `POST /v1/work/assets` — `asset.complete_upload` minus `op`. */
export type WorkAssetCompleteInput = Omit<AssetCompleteUploadOperation, "op">;

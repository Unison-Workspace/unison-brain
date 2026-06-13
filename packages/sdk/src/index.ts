export { ACTOR_ID_RE, BrainClient } from "./client";
export type {
  EntitiesApi,
  FactsApi,
  InvitationsApi,
  JobsApi,
  KeysApi,
  LinksApi,
  ReviewApi,
  WorkspacesApi,
} from "./client";

// Domain APIs + their input types.
export type { JsonRecord } from "./domains/_request";
export type {
  CalendarApi,
  CalendarEventCreateInput,
} from "./domains/calendar";
export type { ChatApi, ChatMessagesOptions, ChatSendInput } from "./domains/chat";
export type { MailApi, MailDraftInput, MailSendInput, MailThreadsOptions } from "./domains/mail";
export type { PeopleApi } from "./domains/people";
export type { ResearchApi, ResearchResult } from "./domains/research";
export type {
  WorkApi,
  WorkAssetReadUrlOptions,
  WorkAssetsApi,
  WorkAssetUploadInput,
  WorkInspectInput,
  WorkInspectKind,
  WorkQueryInput,
  WorkRecordsInput,
  WorkSearchInput,
  WorkTreeInput,
  WorkViewQuery,
} from "./domains/work";
// Canonical Work operation DSL types (snapshot of @unison/agent-shared).
export type * from "./domains/work-operations";
export {
  createInvitation,
  createKey,
  listInvitations,
  listKeys,
  listWorkspaces,
  provisionAccount,
  requestKey,
  revokeInvitation,
  revokeKey,
  verifyEmail,
} from "./auth";
export type {
  ApiKeyRecord,
  CreateInvitationResponse,
  CreateKeyResponse,
  InvitationRecord,
  ProvisionResponse,
  WorkspaceMembershipRecord,
  VerifyResponse,
} from "./auth";
export { AuthError, BrainError } from "./errors";
export { BrainContractError, routeBrainWritePath, WRITABLE_BRAIN_ROOTS } from "./fs-contract";
export { API_VERSION, parseResponse, qs, stripTrailingSlash } from "./http";
export type * from "./types";

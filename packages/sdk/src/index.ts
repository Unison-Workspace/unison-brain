export { BrainClient } from "./client";
export type { EntitiesApi, FactsApi, JobsApi, LinksApi, ReviewApi } from "./client";
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
  WorkSearchInput,
  WorkTreeInput,
  WorkViewQuery,
} from "./domains/work";
// Canonical Work operation DSL types (snapshot of @unison/agent-shared).
export type * from "./domains/work-operations";
export {
  buildAuthorizeUrl,
  exchangeCode,
  generatePkce,
  pollDeviceToken,
  randomState,
  startDeviceAuth,
} from "./auth";
export type { PollResult, PollStatus } from "./auth";
export { AuthError, BrainError } from "./errors";
export { BrainContractError, routeBrainWritePath, WRITABLE_BRAIN_ROOTS } from "./fs-contract";
export { API_VERSION, parseResponse, qs, stripTrailingSlash } from "./http";
export type * from "./types";

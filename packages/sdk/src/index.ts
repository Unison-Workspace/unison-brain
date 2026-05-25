export { BrainClient } from "./client";
export type { EntitiesApi, FactsApi, JobsApi, LinksApi, ReviewApi } from "./client";
// Domain APIs (Phase G) + their input types.
export type { JsonRecord } from "./domains/_request";
export type {
  CalendarApi,
  CalendarEventCreateInput,
} from "./domains/calendar";
export type { ChatApi, ChatMessagesOptions, ChatSendInput } from "./domains/chat";
export type {
  CrmApi,
  CrmNoteCreateInput,
  CrmRecordCreateInput,
  CrmRecordSearchOptions,
  CrmRecordUpdateInput,
} from "./domains/crm";
export type { MailApi, MailDraftInput, MailSendInput, MailThreadsOptions } from "./domains/mail";
export type { PeopleApi } from "./domains/people";
export type {
  TaskCreateInput,
  TaskListOptions,
  TasksApi,
  TaskUpdatePatch,
} from "./domains/tasks";
export type {
  CreateArtifactInput,
  CreateArtifactVersionInput,
  CreateNodeInput,
  CreateTeamSpaceInput,
  UpdateArtifactInput,
  WorkspaceApi,
} from "./domains/workspace";
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
export { API_VERSION, parseResponse, qs, stripTrailingSlash } from "./http";
export type * from "./types";

import { qs } from "../http";
import type { JsonRecord, RequestFn } from "./_request";

export interface MailThreadsOptions {
  folder?: "inbox" | "sent" | "drafts" | "starred" | "trash";
  q?: string;
  cursor?: string;
  limit?: number;
}

export interface MailSendInput {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
  threadId?: string;
}

export interface MailDraftInput {
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
  threadId?: string;
}

export interface MailApi {
  connection(): Promise<JsonRecord>;
  folders(): Promise<JsonRecord>;
  threads(opts?: MailThreadsOptions): Promise<JsonRecord>;
  thread(id: string, opts?: { allowImages?: boolean }): Promise<JsonRecord>;
  send(input: MailSendInput): Promise<JsonRecord>;
  draft(threadId: string): Promise<JsonRecord>;
  createDraft(input: MailDraftInput): Promise<JsonRecord>;
}

export function createMailApi(req: RequestFn): MailApi {
  return {
    connection: () => req("GET", "/mail/connection"),
    folders: () => req("GET", "/mail/folders"),
    threads: (o = {}) => req("GET", `/mail/threads?${qs({ ...o })}`),
    thread: (id, o = {}) =>
      req("GET", `/mail/threads/${encodeURIComponent(id)}?${qs({ allowImages: o.allowImages })}`),
    send: (input) => req("POST", "/mail/send", input),
    draft: (threadId) => req("GET", `/mail/drafts?${qs({ threadId })}`),
    createDraft: (input) => req("POST", "/mail/drafts", input),
  };
}

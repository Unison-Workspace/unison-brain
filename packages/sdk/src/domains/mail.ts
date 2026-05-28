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

export type MailAddressInput = string | { name?: string; email: string };

export interface MailDraftInput {
  /**
   * Recipients for a NEW email. Omit for a reply — when `replyToThreadId` is
   * set the recipients + subject are derived from the thread automatically.
   */
  to?: MailAddressInput[];
  cc?: MailAddressInput[];
  subject?: string;
  body?: string;
  /**
   * Reply INTO an existing Gmail thread. The server builds the thread headers
   * (In-Reply-To / References) + recipient sets from the thread, so the draft
   * sends as a proper threaded reply when the user approves it.
   */
  replyToThreadId?: string;
  /** "reply" = sender only, "reply_all" = everyone on the thread (default for replies). */
  replyMode?: "reply" | "reply_all";
  /**
   * Session the draft attaches to (drives the canvas `app:emails` review
   * surface). In the agent's Deno sandbox it defaults to the injected
   * UNISON_SESSION_ID, so the agent normally doesn't pass it.
   */
  sessionId?: string;
}

export interface MailApi {
  connection(): Promise<JsonRecord>;
  folders(): Promise<JsonRecord>;
  threads(opts?: MailThreadsOptions): Promise<JsonRecord>;
  thread(id: string, opts?: { allowImages?: boolean }): Promise<JsonRecord>;
  send(input: MailSendInput): Promise<JsonRecord>;
  /**
   * Draft an email into the in-app review surface (`app:emails`) for the user to
   * review, edit, approve/send, or discard — the human-in-the-loop email flow.
   * Use this for ALL drafting (new emails AND replies via `replyToThreadId`).
   * Drafting needs no Gmail connection; sending (from the surface) does. This is
   * the only draft path — there is no "save to Gmail Drafts" tool.
   */
  draft(input: MailDraftInput): Promise<JsonRecord>;
}

/**
 * In the agent's Deno sandbox the current session id is injected as
 * UNISON_SESSION_ID (permitted via --allow-env). Returns undefined in other
 * runtimes (CLI / MCP / browser) where there is no such global.
 */
function agentSessionId(): string | undefined {
  const g = globalThis as { Deno?: { env?: { get?: (k: string) => string | undefined } } };
  try {
    return g.Deno?.env?.get?.("UNISON_SESSION_ID");
  } catch {
    return undefined;
  }
}

export function createMailApi(req: RequestFn): MailApi {
  return {
    connection: () => req("GET", "/mail/connection"),
    folders: () => req("GET", "/mail/folders"),
    threads: (o = {}) => req("GET", `/mail/threads?${qs({ ...o })}`),
    thread: (id, o = {}) =>
      req("GET", `/mail/threads/${encodeURIComponent(id)}?${qs({ allowImages: o.allowImages })}`),
    send: (input) => req("POST", "/mail/send", input),
    draft: (input) =>
      req("POST", "/mail/agent-drafts", {
        ...input,
        sessionId: input.sessionId ?? agentSessionId(),
      }),
  };
}

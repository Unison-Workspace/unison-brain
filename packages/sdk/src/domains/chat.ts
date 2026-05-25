import { qs } from "../http";
import type { JsonRecord, RequestFn } from "./_request";

export interface ChatMessagesOptions {
  limit?: number;
  cursor?: string;
}

export interface ChatSendInput {
  channelId: string;
  content?: string;
  mentionUserIds?: string[];
  replyToMessageId?: string;
  threadRootId?: string;
}

export interface ChatApi {
  channels(): Promise<JsonRecord[]>;
  channel(id: string): Promise<JsonRecord>;
  messages(channelId: string, opts?: ChatMessagesOptions): Promise<JsonRecord>;
  send(input: ChatSendInput): Promise<JsonRecord>;
  search(query: string, opts?: { channelId?: string; limit?: number }): Promise<JsonRecord>;
  threadReplies(
    threadRootId: string,
    opts?: { limit?: number; cursor?: string },
  ): Promise<JsonRecord>;
}

export function createChatApi(req: RequestFn): ChatApi {
  return {
    channels: () =>
      req<{ channels: JsonRecord[] }>("GET", "/chat/channels").then((d) => d.channels),
    channel: (id) => req("GET", `/chat/channels/${encodeURIComponent(id)}`),
    messages: (channelId, o = {}) =>
      req("GET", `/chat/messages?${qs({ channelId, limit: o.limit, cursor: o.cursor })}`),
    send: (input) => req("POST", "/chat/messages", input),
    search: (query, o = {}) =>
      req("GET", `/chat/search?${qs({ query, channelId: o.channelId, limit: o.limit })}`),
    threadReplies: (threadRootId, o = {}) =>
      req("GET", `/chat/threads/replies?${qs({ threadRootId, limit: o.limit, cursor: o.cursor })}`),
  };
}

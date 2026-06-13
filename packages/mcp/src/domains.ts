// MCP tools for the non-brain /v1 domains (work, mail, chat, calendar, people).
// Registered alongside the brain tools so a chat-only / IDE-embedded agent can
// act over the whole surface, not just memory.
//
// Work is intentionally a small set of tools, not one-per-op: `work_apply` for
// all writes (it takes the operation DSL directly, matching the in-app agent's
// tool shape) plus read helpers. Fanning out all ~47 ops would blow past the
// "use Tool Search when >20 tools" threshold.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BrainClient, WorkOperation } from "@unisonlabs/sdk";
import { z } from "zod";

interface Deps {
  server: McpServer;
  client: BrainClient;
  ensureAuth: () => void;
  asText: (data: unknown) => { content: { type: "text"; text: string }[] };
}

export function registerDomainTools({ server, client, ensureAuth, asText }: Deps): void {
  // ── Work ───────────────────────────────────────────────────────────────
  server.tool(
    "work_apply",
    "Apply Work primitive operations (the canonical write path for folders, documents, tables, fields, records, record sets, views, artifacts, and assets). Pass the operation DSL directly. Set dryRun to validate without writing.",
    {
      operations: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Operation DSL objects, each with an "op" discriminator, e.g. { op: "record.upsert", tableId, values }',
        ),
      dryRun: z.boolean().optional(),
    },
    async ({ operations, dryRun }) => {
      ensureAuth();
      return asText(
        await client.work.apply({ operations: operations as unknown as WorkOperation[], dryRun }),
      );
    },
  );
  server.tool(
    "work_query",
    "Query a Work view by id (returns the view's records with its filters/sorts applied).",
    {
      viewId: z.string(),
      query: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Optional filters / sorts / limit"),
    },
    async ({ viewId, query }) => {
      ensureAuth();
      return asText(await client.work.query({ viewId, query }));
    },
  );
  server.tool(
    "work_search",
    "Search across Work folders, artifacts, documents, tables, records, and assets.",
    { query: z.string(), limit: z.number().int().positive().optional() },
    async ({ query, limit }) => {
      ensureAuth();
      return asText(await client.work.search({ query, limit }));
    },
  );
  server.tool(
    "work_inspect",
    "Inspect a single Work primitive by kind and id.",
    {
      kind: z.enum(["folder", "artifact", "document", "table", "record_set", "view", "asset"]),
      id: z.string(),
    },
    async ({ kind, id }) => {
      ensureAuth();
      return asText(await client.work.inspect({ kind, id }));
    },
  );
  server.tool(
    "work_tree",
    "Read the Work folder + artifact tree (optionally scoped to a workspace folder).",
    { folderId: z.string().optional() },
    async ({ folderId }) => {
      ensureAuth();
      return asText(await client.work.tree({ folderId }));
    },
  );
  server.tool("work_folder", "Get a Work folder by id.", { id: z.string() }, async ({ id }) => {
    ensureAuth();
    return asText(await client.work.folder(id));
  });
  server.tool(
    "work_artifact",
    "Get a mounted Work artifact by id.",
    { id: z.string() },
    async ({ id }) => {
      ensureAuth();
      return asText(await client.work.artifact(id));
    },
  );

  // ── Mail ───────────────────────────────────────────────────────────────
  server.tool(
    "mail_threads",
    "List mail threads in a folder (default inbox).",
    {
      folder: z.enum(["inbox", "sent", "drafts", "starred", "trash"]).optional(),
      q: z.string().optional(),
      limit: z.number().int().positive().optional(),
    },
    async ({ folder, q, limit }) => {
      ensureAuth();
      return asText(await client.mail.threads({ folder, q, limit }));
    },
  );
  server.tool(
    "mail_send",
    "Send an email. Confirm with the user before sending.",
    {
      to: z.array(z.string()),
      subject: z.string().optional(),
      body: z.string().optional(),
      threadId: z.string().optional(),
    },
    async ({ to, subject, body, threadId }) => {
      ensureAuth();
      return asText(await client.mail.send({ to, subject, body, threadId }));
    },
  );

  // ── Chat ───────────────────────────────────────────────────────────────
  server.tool("chat_channels", "List chat channels.", {}, async () => {
    ensureAuth();
    return asText(await client.chat.channels());
  });
  server.tool(
    "chat_send",
    "Send a chat message to a channel. Confirm with the user before sending.",
    { channelId: z.string(), content: z.string() },
    async ({ channelId, content }) => {
      ensureAuth();
      return asText(await client.chat.send({ channelId, content }));
    },
  );
  server.tool(
    "chat_messages",
    "Read recent messages in a chat channel.",
    {
      channelId: z.string(),
      limit: z.number().int().positive().optional(),
      cursor: z.string().optional(),
    },
    async ({ channelId, limit, cursor }) => {
      ensureAuth();
      return asText(await client.chat.messages(channelId, { limit, cursor }));
    },
  );
  server.tool(
    "chat_members",
    "List or search workspace members to resolve a teammate name to a user id (use before chat_dm). Optional q filters by display name.",
    { q: z.string().optional() },
    async ({ q }) => {
      ensureAuth();
      return asText(await client.chat.members(q));
    },
  );
  server.tool(
    "chat_dm",
    "Open or create a direct-message channel with another user; returns its channelId. Resolve the user id with chat_members first.",
    { otherUserId: z.string() },
    async ({ otherUserId }) => {
      ensureAuth();
      return asText(await client.chat.openDm(otherUserId));
    },
  );

  // ── Calendar ───────────────────────────────────────────────────────────
  server.tool(
    "calendar_events",
    "List calendar events in a time range (ISO datetimes).",
    { from: z.string(), to: z.string() },
    async ({ from, to }) => {
      ensureAuth();
      return asText(await client.calendar.events({ from, to }));
    },
  );

  // ── People ─────────────────────────────────────────────────────────────
  server.tool(
    "people_search",
    "Search people (CRM 'people' records) by name.",
    { query: z.string(), limit: z.number().int().positive().optional() },
    async ({ query, limit }) => {
      ensureAuth();
      return asText(await client.people.search(query, { limit }));
    },
  );
  server.tool(
    "people_list",
    "List people (CRM 'people' records) with no query — the way to enumerate/count everyone.",
    { limit: z.number().int().positive().optional() },
    async ({ limit }) => {
      ensureAuth();
      return asText(await client.people.list({ limit }));
    },
  );

  // ── Work (reads kept in parity with the SDK) ─────────────────────────────
  server.tool(
    "work_records",
    "List a Work table's records directly (no view). Pass tableId for any table, or semanticKind (company/person/deal/task) to read the canonical CRM/Tasks table without discovering its id — the way to list/count/summarize the CRM.",
    {
      tableId: z.string().optional(),
      semanticKind: z.enum(["company", "person", "deal", "task"]).optional(),
      limit: z.number().int().positive().optional(),
    },
    async ({ tableId, semanticKind, limit }) => {
      ensureAuth();
      return asText(await client.work.records({ tableId, semanticKind, limit }));
    },
  );
  server.tool(
    "work_table_schema",
    "Get a Work table's field schema by table id.",
    { id: z.string() },
    async ({ id }) => {
      ensureAuth();
      return asText(await client.work.tableSchema(id));
    },
  );
  server.tool(
    "work_view_query",
    "Run a Work view's query by view id (optional filters/sorts/limit override).",
    { id: z.string(), query: z.record(z.string(), z.unknown()).optional() },
    async ({ id, query }) => {
      ensureAuth();
      return asText(await client.work.viewQuery(id, query));
    },
  );
  // Asset reads only: a short-lived signed download URL. Asset *uploads* are
  // CLI/SDK-only — raw file bytes can't ride over MCP's JSON tool args.
  server.tool(
    "work_asset_read_url",
    "Get a short-lived signed download URL for a Work asset by id.",
    { id: z.string(), expiresIn: z.number().int().positive().optional() },
    async ({ id, expiresIn }) => {
      ensureAuth();
      return asText(await client.work.assets.readUrl(id, { expiresIn }));
    },
  );

  // ── Mail (parity) ────────────────────────────────────────────────────────
  server.tool("mail_connection", "Get the Gmail connection status.", {}, async () => {
    ensureAuth();
    return asText(await client.mail.connection());
  });
  server.tool("mail_folders", "List Gmail folders/labels.", {}, async () => {
    ensureAuth();
    return asText(await client.mail.folders());
  });
  server.tool(
    "mail_thread",
    "Read a single mail thread by id (full messages).",
    { id: z.string(), allowImages: z.boolean().optional() },
    async ({ id, allowImages }) => {
      ensureAuth();
      return asText(await client.mail.thread(id, { allowImages }));
    },
  );
  server.tool(
    "mail_draft",
    "Open an editable email draft for the user to review/send (the ONLY draft surface; drafting needs no Gmail connection). New email: pass to+subject+body. Reply: pass replyToThreadId (+body).",
    {
      to: z.array(z.string()).optional(),
      cc: z.array(z.string()).optional(),
      subject: z.string().optional(),
      body: z.string(),
      replyToThreadId: z.string().optional(),
      replyMode: z.enum(["reply", "reply_all"]).optional(),
    },
    async ({ to, cc, subject, body, replyToThreadId, replyMode }) => {
      ensureAuth();
      return asText(await client.mail.draft({ to, cc, subject, body, replyToThreadId, replyMode }));
    },
  );

  // ── Chat (parity) ──────────────────────────────────────────────────────
  server.tool("chat_channel", "Get a chat channel by id.", { id: z.string() }, async ({ id }) => {
    ensureAuth();
    return asText(await client.chat.channel(id));
  });
  server.tool(
    "chat_search",
    "Search chat messages across channels.",
    { query: z.string(), limit: z.number().int().positive().optional() },
    async ({ query, limit }) => {
      ensureAuth();
      return asText(await client.chat.search(query, { limit }));
    },
  );
  server.tool(
    "chat_thread_replies",
    "List the replies under a thread root message.",
    {
      threadRootId: z.string(),
      limit: z.number().int().positive().optional(),
      cursor: z.string().optional(),
    },
    async ({ threadRootId, limit, cursor }) => {
      ensureAuth();
      return asText(await client.chat.threadReplies(threadRootId, { limit, cursor }));
    },
  );

  // ── Calendar (parity) ────────────────────────────────────────────────────
  server.tool("calendar_connection", "Get the Calendar connection status.", {}, async () => {
    ensureAuth();
    return asText(await client.calendar.connection());
  });
  server.tool("calendar_calendars", "List the user's calendars.", {}, async () => {
    ensureAuth();
    return asText(await client.calendar.calendars());
  });
  server.tool(
    "calendar_event",
    "Get a single calendar event by id.",
    { id: z.string() },
    async ({ id }) => {
      ensureAuth();
      return asText(await client.calendar.event(id));
    },
  );
  server.tool(
    "calendar_create_event",
    "Create a calendar event. Confirm details with the user first.",
    { event: z.record(z.string(), z.unknown()).describe("Event fields (summary, start, end, …)") },
    async ({ event }) => {
      ensureAuth();
      return asText(
        await client.calendar.createEvent(
          event as unknown as Parameters<typeof client.calendar.createEvent>[0],
        ),
      );
    },
  );

  // ── Research (parity) ────────────────────────────────────────────────────
  server.tool(
    "research_search",
    "Run a web/research search and return ranked results.",
    { query: z.string() },
    async ({ query }) => {
      ensureAuth();
      return asText(await client.research.search(query));
    },
  );
}
